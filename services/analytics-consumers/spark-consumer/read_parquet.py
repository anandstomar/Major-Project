import pandas as pd
df = pd.read_parquet("services/analytics-consumers/spark-consumer/data/raw")
print(df.head())
print("rows:", len(df))
