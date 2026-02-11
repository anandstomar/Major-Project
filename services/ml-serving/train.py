import pandas as pd
import numpy as np
import argparse
import mlflow
import mlflow.sklearn
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error
import joblib

# --- Helper Functions ---
def haversine_array(lat1, lng1, lat2, lng2):
    lat1, lng1, lat2, lng2 = map(np.radians, (lat1, lng1, lat2, lng2))
    AVG_EARTH_RADIUS = 6371
    lat = lat2 - lat1
    lng = lng2 - lng1
    d = np.sin(lat * 0.5) ** 2 + np.cos(lat1) * np.cos(lat2) * np.sin(lng * 0.5) ** 2
    h = 2 * AVG_EARTH_RADIUS * np.arcsin(np.sqrt(d))
    return h

def preprocess(df):
    df['pickup_datetime'] = pd.to_datetime(df['pickup_datetime'])
    df['month'] = df['pickup_datetime'].dt.month
    df['day_of_week'] = df['pickup_datetime'].dt.dayofweek
    df['hour'] = df['pickup_datetime'].dt.hour
    df['distance_km'] = haversine_array(
        df['pickup_latitude'], df['pickup_longitude'],
        df['dropoff_latitude'], df['dropoff_longitude']
    )
    features = ['passenger_count', 'pickup_longitude', 'pickup_latitude', 
                'dropoff_longitude', 'dropoff_latitude', 'month', 'day_of_week', 'hour', 'distance_km']
    return df[features]

def train(csv_path, experiment_name="ml-serving-trip", n_estimators=20):
    # 1. Setup MLflow
    # Ensure this points to your running server!
    mlflow.set_tracking_uri("http://127.0.0.1:5000") 
    mlflow.set_experiment(experiment_name)
    
    print(f"Logging to: {mlflow.get_tracking_uri()}")
    
    # 2. Start Run
    with mlflow.start_run():
        print("Loading data...")
        df = pd.read_csv(csv_path)
        
        y = df['trip_duration']
        X = preprocess(df)
        
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
        
        # 3. Train
        model = RandomForestRegressor(n_estimators=n_estimators, n_jobs=-1, max_depth=10)
        model.fit(X_train, y_train)
        
        preds = model.predict(X_test)
        rmse = np.sqrt(mean_squared_error(y_test, preds))
        print(f"RMSE: {rmse:.2f}")
        
        # 4. Log Metrics & Params to MLflow
        mlflow.log_param("n_estimators", n_estimators)
        mlflow.log_param("model_type", "RandomForestRegressor")
        mlflow.log_metric("rmse", rmse)
        
        # 5. Log Model to MLflow
        mlflow.sklearn.log_model(model, "model", registered_model_name="NYC_Taxi_Trip_Estimator")
        
        # 6. Save Local Backup (for Docker)
        joblib.dump(model, "model.pkl")
        print("Model saved to model.pkl and logged to MLflow")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--data-csv", default="nyc_taxi_data.csv")
    args = parser.parse_args()
    train(args.data_csv)



# import os
# import argparse
# import pandas as pd
# import numpy as np
# import mlflow
# import mlflow.sklearn
# from sklearn.ensemble import RandomForestRegressor
# from sklearn.model_selection import train_test_split
# from sklearn.metrics import mean_squared_error

# def load_data(csv_path):
#     # Adjust to dataset schema from Kaggle notebook
#     df = pd.read_csv(csv_path)
#     # Example preprocessing: (modify per Kaggle features)
#     # drop rows with nulls
#     df = df.dropna()
#     # example features - replace with actual ones
#     # assume 'trip_time' target and others as features
#     X = df.drop(columns=['trip_time'])
#     y = df['trip_time'].values
#     return X, y

# def train(csv_path, experiment_name="ml-serving-trip", run_name=None, n_estimators=50):
#     mlflow.set_experiment(experiment_name)
#     with mlflow.start_run(run_name=run_name) as run:
#         X, y = load_data(csv_path)
#         X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

#         model = RandomForestRegressor(n_estimators=n_estimators, random_state=42, n_jobs=-1)
#         model.fit(X_train, y_train)

#         preds = model.predict(X_test)
#         rmse = mean_squared_error(y_test, preds, squared=False)
#         mlflow.log_metric("rmse", float(rmse))
#         mlflow.log_param("n_estimators", n_estimators)

#         # log model artifact
#         mlflow.sklearn.log_model(model, "model", registered_model_name="trip-time-estimator")

#         # also save local pickle for local dev
#         import joblib
#         joblib.dump(model, "model.pkl")
#         mlflow.log_artifact("model.pkl")

#         print("training finished. RMSE:", rmse)
#         return run.info.run_id

# if __name__ == "__main__":
#     parser = argparse.ArgumentParser()
#     parser.add_argument("--data-csv", required=True, help="CSV with features and target")
#     parser.add_argument("--n-estimators", type=int, default=50)
#     parser.add_argument("--experiment", default="ml-serving-trip")
#     args = parser.parse_args()
#     train(args.data_csv, experiment_name=args.experiment, n_estimators=args.n_estimators)
