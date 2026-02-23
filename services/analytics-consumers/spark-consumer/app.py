# app.py
import os
import json
import time
import threading
import logging
from pyspark.sql import SparkSession  # type: ignore
from pyspark.sql.types import StructType, StringType, ArrayType, LongType, TimestampType  # type: ignore
from pyspark.sql.functions import from_json, col, to_timestamp, to_date, window, to_json, struct  # type: ignore
import requests

from flask import Flask, jsonify
from flask_cors import CORS

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("spark-consumer")

# Environment
KAFKA_BOOTSTRAP = os.environ.get("KAFKA_BOOTSTRAP", "kafka-external:9092")
KAFKA_TOPIC = os.environ.get("KAFKA_TOPIC", "anchors.completed")
KAFKA_OUT_TOPIC = os.environ.get("KAFKA_OUT_TOPIC", "analytics.anchors.hourly")
CHECKPOINT_BASE = os.environ.get("CHECKPOINT_BASE", "/tmp/checkpoints/analytics")
PARQUET_PATH = os.environ.get("PARQUET_PATH", "s3a://analytics/anchors")   # MinIO/S3
PUSHGATEWAY = os.environ.get("PUSHGATEWAY_URL")  # e.g. http://pushgateway:9091
APP_NAME = os.environ.get("APP_NAME", "analytics-spark-consumer")
BATCH_HOUR_WINDOW = os.environ.get("BATCH_HOUR_WINDOW", "1 hour")

LATEST_AGGREGATES = []
flask_app = Flask(__name__)
CORS(flask_app)

# Flask API Routing
@flask_app.route('/api/v1/analytics/hourly', methods=['GET'])
def get_hourly_analytics():
    """The API endpoint React will call!"""
    return jsonify({"items": LATEST_AGGREGATES})

def run_flask():
    """Runs the Flask server on port 5001"""
    log.info("Starting Flask API Server on port 5001...")
    flask_app.run(host='0.0.0.0', port=5001, debug=False, use_reloader=False)

# JSON schema of anchors.completed
schema = StructType()\
    .add("request_id", StringType())\
    .add("merkle_root", StringType())\
    .add("tx_hash", StringType())\
    .add("block_number", LongType())\
    .add("submitted_at", StringType())\
    .add("submitter", StringType())\
    .add("status", StringType())\
    .add("preview_ids", ArrayType(StringType()))\
    .add("events", ArrayType(StringType()))

def push_metrics(pushgateway_url, job, labels, metrics):
    if not pushgateway_url:
        return
    lines = []
    for m, v in metrics.items():
        lines.append(f'{m} {v}')
    body = "\n".join(lines) + "\n"
    target = f"{pushgateway_url}/metrics/job/{job}"
    for k, val in (labels or {}).items():
        target += f"/{k}/{val}"
    try:
        resp = requests.put(target, data=body, timeout=5)
        resp.raise_for_status()
    except Exception as e:
        log.warning("pushgateway push failed: %s", e)

def foreach_batch_write_parquet_and_aggregate(df, epoch_id):
    global LATEST_AGGREGATES
    log.info("foreachBatch called epoch_id=%s rows=%d", epoch_id, df.count())
    if df.rdd.isEmpty():
        return

    # write raw batch to parquet (append)
    try:
        raw_out = df \
            .withColumn("submitted_at_ts", to_timestamp(col("submitted_at"))) \
            .withColumn("date", to_date(col("submitted_at_ts")))
        raw_out.write.mode("append").parquet(f"{PARQUET_PATH}/raw/")
        log.info("wrote raw parquet rows=%d", raw_out.count())
    except Exception as e:
        log.exception("parquet write failed: %s", e)

    # compute hourly aggregates (windowed count by status)
    try:
        agg = df \
            .withColumn("submitted_at_ts", to_timestamp(col("submitted_at"))) \
            .groupBy(window(col("submitted_at_ts"), BATCH_HOUR_WINDOW), col("status")) \
            .count() \
            .select(
                col("window.start").alias("window_start"),
                col("window.end").alias("window_end"),
                col("status"),
                col("count")
            )
            
        rows = agg.collect()
        LATEST_AGGREGATES = [
            {
                "window_start": row["window_start"].isoformat() if row["window_start"] else None,
                "window_end": row["window_end"].isoformat() if row["window_end"] else None,
                "status": row["status"],
                "count": row["count"]
            }
            for row in rows
        ]
        log.info("Updated Flask API memory with %d aggregate windows", len(LATEST_AGGREGATES))
        
        # publish aggregates to Kafka (as JSON strings)
        kafka_rows = agg.select(to_json(struct(col("window_start"), col("window_end"), col("status"), col("count"))).alias("value"))
        kafka_rows \
            .selectExpr("CAST(value AS STRING) AS value") \
            .write \
            .format("kafka") \
            .option("kafka.bootstrap.servers", KAFKA_BOOTSTRAP) \
            .option("topic", KAFKA_OUT_TOPIC) \
            .save()
        nagg = agg.count()
        log.info("published %d aggregate rows to kafka topic=%s", nagg, KAFKA_OUT_TOPIC)
        
        # push metrics
        if PUSHGATEWAY:
            total_count = agg.selectExpr("sum(count) as s").collect()[0]["s"]
            metrics = {
                "anchors_aggregates_batch_total": int(total_count or 0),
                "anchors_aggregates_groups": int(nagg)
            }
            push_metrics(PUSHGATEWAY, APP_NAME, {"epoch": str(epoch_id)}, metrics)
    except Exception as e:
        log.exception("aggregate publish failed: %s", e)


def main():
    api_thread = threading.Thread(target=run_flask, daemon=True)
    api_thread.start()
    
    os.makedirs("/tmp/spark", exist_ok=True)
    spark = SparkSession.builder \
        .appName(APP_NAME) \
        .master("local[1]") \
        .config("spark.python.worker.reuse", "false") \
        .config("spark.python.use.daemon", "false") \
        .config("spark.sql.shuffle.partitions", "1") \
        .config("spark.default.parallelism", "1") \
        .config("spark.sql.parquet.compression.codec", "gzip") \
        .config("spark.local.dir", "/tmp/spark") \
        .config("spark.jars.packages", "org.apache.spark:spark-sql-kafka-0-10_2.12:3.5.0,org.apache.hadoop:hadoop-aws:3.3.4") \
        .config("spark.hadoop.fs.s3a.endpoint", os.environ.get("S3A_ENDPOINT", "http://minio.default.svc.cluster.local:9000")) \
        .config("spark.hadoop.fs.s3a.access.key", os.environ.get("S3A_ACCESS_KEY", "minioadmin")) \
        .config("spark.hadoop.fs.s3a.secret.key", os.environ.get("S3A_SECRET_KEY", "minioadmin")) \
        .config("spark.hadoop.fs.s3a.path.style.access", "true") \
        .getOrCreate()

    spark.sparkContext.setLogLevel("WARN")
    log.info("Spark session started")

    raw = spark.readStream \
        .format("kafka") \
        .option("kafka.bootstrap.servers", KAFKA_BOOTSTRAP) \
        .option("subscribe", KAFKA_TOPIC) \
        .option("startingOffsets", "latest") \
        .load() \
        .selectExpr("CAST(value AS STRING) as json_str")

    parsed = raw.select(from_json(col("json_str"), schema).alias("data")).select("data.*")

    query = parsed.writeStream \
        .option("checkpointLocation", f"{CHECKPOINT_BASE}/raw") \
        .foreachBatch(foreach_batch_write_parquet_and_aggregate) \
        .start()

    log.info("Streaming started. Listening to topic=%s", KAFKA_TOPIC)
    try:
        query.awaitTermination()
    except KeyboardInterrupt:
        log.info("Stopping streaming")
        query.stop()

if __name__ == "__main__":
    main()




# # app.py
# import os
# import json
# import time
# import threading
# import logging
# from pyspark.sql import SparkSession  # type: ignore
# from pyspark.sql.types import StructType, StringType, ArrayType, LongType, TimestampType  # type: ignore
# from pyspark.sql.functions import from_json, col, to_timestamp, to_date, window, to_json, struct  # type: ignore
# import requests

# from flask import Flask, jsonify
# from flask_cors import CORS

# logging.basicConfig(level=logging.INFO)
# log = logging.getLogger("spark-consumer")

# # Environment (with sensible defaults)
# KAFKA_BOOTSTRAP = os.environ.get("KAFKA_BOOTSTRAP", "kafka-external:9092")
# KAFKA_TOPIC = os.environ.get("KAFKA_TOPIC", "anchors.completed")
# KAFKA_OUT_TOPIC = os.environ.get("KAFKA_OUT_TOPIC", "analytics.anchors.hourly")
# CHECKPOINT_BASE = os.environ.get("CHECKPOINT_BASE", "/tmp/checkpoints/analytics")
# PARQUET_PATH = os.environ.get("PARQUET_PATH", "s3a://analytics/anchors")   # MinIO/S3
# PUSHGATEWAY = os.environ.get("PUSHGATEWAY_URL")  # e.g. http://pushgateway:9091
# APP_NAME = os.environ.get("APP_NAME", "analytics-spark-consumer")
# BATCH_HOUR_WINDOW = os.environ.get("BATCH_HOUR_WINDOW", "1 hour")

# LATEST_AGGREGATES = []
# flask_app = Flask(__name__)
# CORS(flask_app)

# # JSON schema of anchors.completed
# schema = StructType()\
#     .add("request_id", StringType())\
#     .add("merkle_root", StringType())\
#     .add("tx_hash", StringType())\
#     .add("block_number", LongType())\
#     .add("submitted_at", StringType())\
#     .add("submitter", StringType())\
#     .add("status", StringType())\
#     .add("preview_ids", ArrayType(StringType()))\
#     .add("events", ArrayType(StringType()))

# def push_metrics(pushgateway_url, job, labels, metrics):
#     """
#     Push simple batch metrics to Pushgateway using HTTP PUT in Prometheus text format.
#     metrics: dict of metric_name->(value, optional_labels_dict)
#     labels: dict for job labels
#     """
#     if not pushgateway_url:
#         return
#     lines = []
#     for m, v in metrics.items():
#         # no help/TYPE lines - simple push
#         lines.append(f'{m} {v}')
#     body = "\n".join(lines) + "\n"
#     # example: POST /metrics/job/<job>{/<labelname>/<labelvalue>}
#     target = f"{pushgateway_url}/metrics/job/{job}"
#     # add extra labels in URL path
#     for k, val in (labels or {}).items():
#         target += f"/{k}/{val}"
#     try:
#         resp = requests.put(target, data=body, timeout=5)
#         resp.raise_for_status()
#     except Exception as e:
#         log.warning("pushgateway push failed: %s", e)

# def foreach_batch_write_parquet_and_aggregate(df, epoch_id):
#     """
#     This runs on the driver per micro-batch. We:
#       - append batch to parquet store
#       - compute hourly aggregates and publish to Kafka topic
#       - push metrics to pushgateway
#     """
#     log.info("foreachBatch called epoch_id=%s rows=%d", epoch_id, df.count())
#     if df.rdd.isEmpty():
#         return

#     # write raw batch to parquet (append)
#     try:
#         raw_out = df \
#             .withColumn("submitted_at_ts", to_timestamp(col("submitted_at"))) \
#             .withColumn("date", to_date(col("submitted_at_ts")))
#         raw_out.write.mode("append").parquet(f"{PARQUET_PATH}/raw/")
#         log.info("wrote raw parquet rows=%d", raw_out.count())
#     except Exception as e:
#         log.exception("parquet write failed: %s", e)

#     # compute hourly aggregates (windowed count by status)
#     try:
#         agg = df \
#             .withColumn("submitted_at_ts", to_timestamp(col("submitted_at"))) \
#             .groupBy(window(col("submitted_at_ts"), BATCH_HOUR_WINDOW), col("status")) \
#             .count() \
#             .select(
#                 col("window.start").alias("window_start"),
#                 col("window.end").alias("window_end"),
#                 col("status"),
#                 col("count")
#             )
            
#         rows = agg.collect()
#         LATEST_AGGREGATES = [
#             {
#                 "window_start": row["window_start"].isoformat() if row["window_start"] else None,
#                 "window_end": row["window_end"].isoformat() if row["window_end"] else None,
#                 "status": row["status"],
#                 "count": row["count"]
#             }
#             for row in rows
#         ]
#         log.info("Updated Flask API memory with %d aggregate windows", len(LATEST_AGGREGATES))
        
#         # publish aggregates to Kafka (as JSON strings)
#         kafka_rows = agg.select(to_json(struct(col("window_start"), col("window_end"), col("status"), col("count"))).alias("value"))
#         # use DataFrame write to Kafka sink (requires same Spark session)
#         kafka_rows \
#             .selectExpr("CAST(value AS STRING) AS value") \
#             .write \
#             .format("kafka") \
#             .option("kafka.bootstrap.servers", KAFKA_BOOTSTRAP) \
#             .option("topic", KAFKA_OUT_TOPIC) \
#             .save()
#         nagg = agg.count()
#         log.info("published %d aggregate rows to kafka topic=%s", nagg, KAFKA_OUT_TOPIC)
#         # push metrics
#         if PUSHGATEWAY:
#             # sum of counts
#             total_count = agg.selectExpr("sum(count) as s").collect()[0]["s"]
#             metrics = {
#                 "anchors_aggregates_batch_total": int(total_count or 0),
#                 "anchors_aggregates_groups": int(nagg)
#             }
#             push_metrics(PUSHGATEWAY, APP_NAME, {"epoch": str(epoch_id)}, metrics)
#     except Exception as e:
#         log.exception("aggregate publish failed: %s", e)


# def main():
#     api_thread = threading.Thread(target=run_flask, daemon=True)
#     api_thread.start()
#     # spark = SparkSession.builder \
#     #     .appName(APP_NAME) \
#     #     .config("spark.jars.packages", "org.apache.spark:spark-sql-kafka-0-10_2.12:3.4.1,org.apache.hadoop:hadoop-aws:3.3.4") \
#     #     .config("spark.sql.shuffle.partitions", os.environ.get("SPARK_PARTITIONS", "8")) \
#     #     .config("spark.hadoop.fs.s3a.endpoint", os.environ.get("S3A_ENDPOINT", "http://minio:9000")) \
#     #     .config("spark.hadoop.fs.s3a.access.key", os.environ.get("S3A_ACCESS_KEY", "minioadmin")) \
#     #     .config("spark.hadoop.fs.s3a.secret.key", os.environ.get("S3A_SECRET_KEY", "minioadmin")) \
#     #     .config("spark.hadoop.fs.s3a.path.style.access", "true") \
#     #     .getOrCreate()
#     os.makedirs("/tmp/spark", exist_ok=True)
#     spark = SparkSession.builder \
#         .appName(APP_NAME) \
#         \
#         .master("local[1]") \
#         .config("spark.python.worker.reuse", "false") \
#         .config("spark.python.use.daemon", "false") \
#         .config("spark.sql.shuffle.partitions", "1") \
#         .config("spark.default.parallelism", "1") \
#         .config("spark.sql.parquet.compression.codec", "gzip") \
#         .config("spark.local.dir", "/tmp/spark") \
#         \
#         .config("spark.jars.packages", "org.apache.spark:spark-sql-kafka-0-10_2.12:3.5.0,org.apache.hadoop:hadoop-aws:3.3.4") \
#         .config("spark.hadoop.fs.s3a.endpoint", os.environ.get("S3A_ENDPOINT", "http://minio.default.svc.cluster.local:9000")) \
#         .config("spark.hadoop.fs.s3a.access.key", os.environ.get("S3A_ACCESS_KEY", "minioadmin")) \
#         .config("spark.hadoop.fs.s3a.secret.key", os.environ.get("S3A_SECRET_KEY", "minioadmin")) \
#         .config("spark.hadoop.fs.s3a.path.style.access", "true") \
#         .getOrCreate()

#     # (Keep the rest of the code exactly the same from here...)
#     spark.sparkContext.setLogLevel("WARN")
#     log.info("Spark session started")
    
#     # ... existing readStream code ...

#     spark.sparkContext.setLogLevel("WARN")
#     log.info("Spark session started")

#     raw = spark.readStream \
#         .format("kafka") \
#         .option("kafka.bootstrap.servers", KAFKA_BOOTSTRAP) \
#         .option("subscribe", KAFKA_TOPIC) \
#         .option("startingOffsets", "latest") \
#         .load() \
#         .selectExpr("CAST(value AS STRING) as json_str")

#     parsed = raw.select(from_json(col("json_str"), schema).alias("data")).select("data.*")

#     # Define checkpoint and write raw parquet via foreachBatch
#     query = parsed.writeStream \
#         .option("checkpointLocation", f"{CHECKPOINT_BASE}/raw") \
#         .foreachBatch(foreach_batch_write_parquet_and_aggregate) \
#         .start()

#     log.info("Streaming started. Listening to topic=%s", KAFKA_TOPIC)
#     try:
#         query.awaitTermination()
#     except KeyboardInterrupt:
#         log.info("Stopping streaming")
#         query.stop()

# if __name__ == "__main__":
#     main()
