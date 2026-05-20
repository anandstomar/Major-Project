from airflow import DAG
from airflow.providers.apache.spark.operators.spark_submit import SparkSubmitOperator
from airflow.providers.postgres.operators.postgres import PostgresOperator
from airflow.operators.python import PythonOperator
from airflow.utils.dates import days_ago
from datetime import timedelta
import logging

# Default settings for all tasks in this pipeline
default_args = {
    'owner': 'data_engineering_team',
    'depends_on_past': False,
    'email_on_failure': True,
    'email_on_retry': False,
    'retries': 2,
    'retry_delay': timedelta(minutes=5),
}

# Define the DAG
with DAG(
    dag_id='daily_anchor_analytics_maintenance',
    default_args=default_args,
    description='Nightly maintenance, optimization, and serving layer refresh for Anchor data',
    schedule_interval='@daily',  # Runs every night at midnight
    start_date=days_ago(1),
    catchup=False,
    tags=['analytics', 'solana', 'delta-lake'],
) as dag:

    # ==========================================
    # TASK 1: Optimize Delta Lake Tables
    # ==========================================
    # Streaming creates many tiny files. This Spark job compacts them to keep S3/MinIO fast.
    optimize_delta_tables = SparkSubmitOperator(
        task_id='optimize_delta_tables',
        application='/opt/spark/scripts/optimize_delta.py',
        conn_id='spark_default',
        name='airflow-optimize-delta',
        conf={
            "spark.sql.extensions": "io.delta.sql.DeltaSparkSessionExtension",
            "spark.sql.catalog.spark_catalog": "org.apache.spark.sql.delta.catalog.DeltaCatalog"
        }
    )

    # ==========================================
    # TASK 2: Data Quality Check
    # ==========================================
    # Check if we have an abnormally high failure rate in yesterday's anchors
    def run_data_quality_check():
        logging.info("Connecting to Delta Lake to verify anomaly thresholds...")
        # In reality, you would use a tool like Great Expectations here.
        # For now, we simulate a check passing.
        failure_rate = 0.02 # Simulated 2% failure rate
        if failure_rate > 0.10:
            raise ValueError("DATA QUALITY ALERT: Anchor failure rate exceeded 10%!")
        logging.info("Data quality check passed.")

    dq_check = PythonOperator(
        task_id='data_quality_check',
        python_callable=run_data_quality_check
    )

    # ==========================================
    # TASK 3: Refresh Postgres Serving Layer
    # ==========================================
    # Update the database that your FastAPI/React dashboard reads from
    refresh_dashboard_db = PostgresOperator(
        task_id='refresh_postgres_materialized_views',
        postgres_conn_id='postgres_default',
        sql="""
            -- Assuming you have a materialized view for fast dashboard loading
            REFRESH MATERIALIZED VIEW CONCURRENTLY daily_anchor_stats;
        """
    )

    # ==========================================
    # DEFINE THE DEPENDENCIES (The actual "Graph")
    # ==========================================
    # This dictates the order of execution. 
    # It reads as: "Run optimization, THEN check quality, THEN refresh the database."
    
    optimize_delta_tables >> dq_check >> refresh_dashboard_db