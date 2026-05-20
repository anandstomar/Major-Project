import os
import logging
from pyspark.sql import SparkSession
from pyspark.sql.types import StructType, StringType, BooleanType
from pyspark.sql.functions import from_json, col, to_timestamp, window, to_json, struct, when

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("spark-consumer")

# Environment Variables
KAFKA_BOOTSTRAP = os.environ.get("KAFKA_BOOTSTRAP", "kafka-external:9092")
KAFKA_TOPIC = os.environ.get("KAFKA_TOPIC", "anchors.verified")
KAFKA_OUT_TOPIC = os.environ.get("KAFKA_OUT_TOPIC", "analytics.anchors.hourly")
CHECKPOINT_BASE = os.environ.get("CHECKPOINT_BASE", "/tmp/checkpoints/analytics_verified")

# 👇 UPDATED: Changed Parquet to Delta
DELTA_PATH = os.environ.get("DELTA_PATH", "s3a://analytics/anchors_verified_delta") 
APP_NAME = "analytics-spark-verifier"

# Schema definition
schema = StructType()\
    .add("request_id", StringType())\
    .add("merkle_root", StringType())\
    .add("computed_root", StringType())\
    .add("merkle_match", BooleanType())\
    .add("tx_hash", StringType())\
    .add("tx_exists", BooleanType())\
    .add("submitted_at", StringType())\
    .add("submitter", StringType())\
    .add("status", StringType())\
    .add("verified_at", StringType())

def main():
    log.info("Starting Advanced Spark Streaming Job (Delta + Watermarking)...")
    
    os.makedirs("/tmp/spark", exist_ok=True)
    
    # 👇 UPDATED: Added Delta Lake packages and SQL extensions
    spark = SparkSession.builder \
        .appName(APP_NAME) \
        .master("local[1]") \
        .config("spark.sql.shuffle.partitions", "2") \
        .config("spark.default.parallelism", "2") \
        .config("spark.local.dir", "/tmp/spark") \
        .config("spark.jars.packages", "org.apache.spark:spark-sql-kafka-0-10_2.12:3.5.0,org.apache.hadoop:hadoop-aws:3.3.4,io.delta:delta-spark_2.12:3.0.0") \
        .config("spark.sql.extensions", "io.delta.sql.DeltaSparkSessionExtension") \
        .config("spark.sql.catalog.spark_catalog", "org.apache.spark.sql.delta.catalog.DeltaCatalog") \
        .config("spark.hadoop.fs.s3a.endpoint", os.environ.get("S3A_ENDPOINT", "http://minio.default.svc.cluster.local:9000")) \
        .config("spark.hadoop.fs.s3a.access.key", os.environ.get("S3A_ACCESS_KEY", "minioadmin")) \
        .config("spark.hadoop.fs.s3a.secret.key", os.environ.get("S3A_SECRET_KEY", "minioadmin")) \
        .config("spark.hadoop.fs.s3a.path.style.access", "true") \
        .getOrCreate()

    spark.sparkContext.setLogLevel("WARN")

    # 1. Read from Kafka
    raw = spark.readStream \
        .format("kafka") \
        .option("kafka.bootstrap.servers", KAFKA_BOOTSTRAP) \
        .option("subscribe", KAFKA_TOPIC) \
        .option("startingOffsets", "earliest") \
        .load() \
        .selectExpr("CAST(value AS STRING) as json_str")

    # 2. Parse and apply base transformations
    transformed_df = raw.select(from_json(col("json_str"), schema).alias("data")).select("data.*") \
        .withColumn("dashboard_status", when(col("merkle_match") == True, "OK").otherwise("FAILED")) \
        .withColumn("submitted_at_ts", to_timestamp(col("submitted_at")))

    # ==========================================
    # STREAM 1: Write Raw Data to Delta Lake
    # ==========================================
    raw_query = transformed_df.writeStream \
        .format("delta") \
        .outputMode("append") \
        .option("checkpointLocation", f"{CHECKPOINT_BASE}/raw_delta") \
        .start(f"{DELTA_PATH}/raw")

    # ==========================================
    # STREAM 2: Stateful Aggregation to Kafka
    # ==========================================
    # 👇 UPDATED: 2-hour watermark for late data, grouped by 1-hour tumbling windows
    agg_df = transformed_df \
        .withWatermark("submitted_at_ts", "2 hours") \
        .groupBy(
            window(col("submitted_at_ts"), "1 hour"), 
            col("dashboard_status").alias("status")
        ).count()

    # Format output for Kafka (Kafka requires 'key' and 'value' columns)
    kafka_output_df = agg_df.selectExpr(
        "CAST(window.start AS STRING) AS key",
        "to_json(struct(window.start as window_start, window.end as window_end, status, count)) AS value"
    )

    # OutputMode "update" emits only the rows that have changed since the last trigger
    agg_query = kafka_output_df.writeStream \
        .format("kafka") \
        .outputMode("update") \
        .option("kafka.bootstrap.servers", KAFKA_BOOTSTRAP) \
        .option("topic", KAFKA_OUT_TOPIC) \
        .option("checkpointLocation", f"{CHECKPOINT_BASE}/agg_kafka") \
        .start()

    # Wait for both streams to process
    spark.streams.awaitAnyTermination()

if __name__ == "__main__":
    main()





# import os
# import threading
# import logging
# from pyspark.sql import SparkSession 
# from pyspark.sql.types import StructType, StringType, ArrayType, LongType, BooleanType 
# from pyspark.sql.functions import from_json, col, to_timestamp, to_date, window, to_json, struct, when 
# import requests

# from flask import Flask, jsonify
# from flask_cors import CORS

# logging.basicConfig(level=logging.INFO)
# log = logging.getLogger("spark-consumer")

# # 👇 UPDATED: Pointing to the Verified Topic
# KAFKA_BOOTSTRAP = os.environ.get("KAFKA_BOOTSTRAP", "kafka-external:9092")
# KAFKA_TOPIC = os.environ.get("KAFKA_TOPIC", "anchors.verified") # <--- CHANGED
# KAFKA_OUT_TOPIC = os.environ.get("KAFKA_OUT_TOPIC", "analytics.anchors.hourly")
# CHECKPOINT_BASE = os.environ.get("CHECKPOINT_BASE", "/tmp/checkpoints/analytics_verified") # <--- CHANGED PATH
# PARQUET_PATH = os.environ.get("PARQUET_PATH", "s3a://analytics/anchors_verified") 
# APP_NAME = "analytics-spark-verifier"
# BATCH_HOUR_WINDOW = os.environ.get("BATCH_HOUR_WINDOW", "1 hour")

# LATEST_AGGREGATES = []
# flask_app = Flask(__name__)
# CORS(flask_app)

# @flask_app.route('/api/v1/analytics/hourly', methods=['GET'])
# def get_hourly_analytics():
#     return jsonify({"items": LATEST_AGGREGATES})

# def run_flask():
#     log.info("Starting Flask API Server on port 5001...")
#     flask_app.run(host='0.0.0.0', port=5001, debug=False, use_reloader=False)

# # 👇 UPDATED: Schema matches your 'anchors.verified' JSON exactly
# schema = StructType()\
#     .add("request_id", StringType())\
#     .add("merkle_root", StringType())\
#     .add("computed_root", StringType())\
#     .add("merkle_match", BooleanType())\
#     .add("tx_hash", StringType())\
#     .add("tx_exists", BooleanType())\
#     .add("submitted_at", StringType())\
#     .add("submitter", StringType())\
#     .add("status", StringType())\
#     .add("verified_at", StringType())

# def foreach_batch_write_parquet_and_aggregate(df, epoch_id):
#     global LATEST_AGGREGATES
#     if df.rdd.isEmpty():
#         return

#     # 1. Transform Logic: Map "merkle_match" to Dashboard Status
#     # If merkle_match is True -> Status = "OK" (Green Badge)
#     # If merkle_match is False -> Status = "FAILED" (Red Badge)
#     transformed_df = df \
#         .withColumn("dashboard_status", when(col("merkle_match") == True, "OK").otherwise("FAILED")) \
#         .withColumn("submitted_at_ts", to_timestamp(col("submitted_at"))) \
#         .withColumn("date", to_date(col("submitted_at_ts")))

#     try:
#         # Write raw data
#         transformed_df.write.mode("append").parquet(f"{PARQUET_PATH}/raw/")
#     except Exception as e:
#         log.exception("parquet write failed")

#     try:
#         # Compute Hourly Aggregates using the new "dashboard_status"
#         agg = transformed_df \
#             .groupBy(window(col("submitted_at_ts"), BATCH_HOUR_WINDOW), col("dashboard_status").alias("status")) \
#             .count() \
#             .select(
#                 col("window.start").alias("window_start"),
#                 col("window.end").alias("window_end"),
#                 col("status"),
#                 col("count")
#             )
            
#         # Update Flask Memory
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
#         log.info("Updated Flask API with %d windows", len(LATEST_AGGREGATES))
        
#         # Publish to Kafka for other services
#         agg.select(to_json(struct(col("window_start"), col("window_end"), col("status"), col("count"))).alias("value")) \
#             .selectExpr("CAST(value AS STRING) AS value") \
#             .write \
#             .format("kafka") \
#             .option("kafka.bootstrap.servers", KAFKA_BOOTSTRAP) \
#             .option("topic", KAFKA_OUT_TOPIC) \
#             .save()
            
#     except Exception as e:
#         log.exception("aggregate failed")

# def main():
#     threading.Thread(target=run_flask, daemon=True).start()
    
#     # ... (Spark Session Builder remains exactly the same) ...
#     os.makedirs("/tmp/spark", exist_ok=True)
#     spark = SparkSession.builder \
#         .appName(APP_NAME) \
#         .master("local[1]") \
#         .config("spark.sql.shuffle.partitions", "1") \
#         .config("spark.default.parallelism", "1") \
#         .config("spark.local.dir", "/tmp/spark") \
#         .config("spark.jars.packages", "org.apache.spark:spark-sql-kafka-0-10_2.12:3.5.0,org.apache.hadoop:hadoop-aws:3.3.4") \
#         .config("spark.hadoop.fs.s3a.endpoint", os.environ.get("S3A_ENDPOINT", "http://minio.default.svc.cluster.local:9000")) \
#         .config("spark.hadoop.fs.s3a.access.key", os.environ.get("S3A_ACCESS_KEY", "minioadmin")) \
#         .config("spark.hadoop.fs.s3a.secret.key", os.environ.get("S3A_SECRET_KEY", "minioadmin")) \
#         .config("spark.hadoop.fs.s3a.path.style.access", "true") \
#         .getOrCreate()

#     spark.sparkContext.setLogLevel("WARN")

#     # 👇 UPDATED: startingOffsets="earliest" to catch the 17 messages waiting in the topic!
#     raw = spark.readStream \
#         .format("kafka") \
#         .option("kafka.bootstrap.servers", KAFKA_BOOTSTRAP) \
#         .option("subscribe", KAFKA_TOPIC) \
#         .option("startingOffsets", "earliest") \
#         .load() \
#         .selectExpr("CAST(value AS STRING) as json_str")

#     parsed = raw.select(from_json(col("json_str"), schema).alias("data")).select("data.*")

#     query = parsed.writeStream \
#         .option("checkpointLocation", f"{CHECKPOINT_BASE}/raw") \
#         .foreachBatch(foreach_batch_write_parquet_and_aggregate) \
#         .start()

#     query.awaitTermination()

# if __name__ == "__main__":
#     main()

