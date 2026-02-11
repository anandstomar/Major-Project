# services/ml-serving/generate_data.py
import pandas as pd
import numpy as np
from datetime import datetime, timedelta

def generate_nyc_data(n_rows=1000):
    print(f"Generating {n_rows} rows of dummy NYC taxi data...")
    
    # NYC Coordinates (approximate)
    lat_min, lat_max = 40.60, 40.90
    lon_min, lon_max = -74.05, -73.75

    data = {
        'id': [f'id{i}' for i in range(n_rows)],
        'vendor_id': np.random.randint(1, 3, n_rows),
        'pickup_datetime': [
            (datetime(2016, 1, 1) + timedelta(minutes=np.random.randint(0, 500000))).strftime('%Y-%m-%d %H:%M:%S')
            for _ in range(n_rows)
        ],
        'passenger_count': np.random.randint(1, 7, n_rows),
        'pickup_longitude': np.random.uniform(lon_min, lon_max, n_rows),
        'pickup_latitude': np.random.uniform(lat_min, lat_max, n_rows),
        'dropoff_longitude': np.random.uniform(lon_min, lon_max, n_rows),
        'dropoff_latitude': np.random.uniform(lat_min, lat_max, n_rows),
        'store_and_fwd_flag': np.random.choice(['Y', 'N'], n_rows),
        # Target: trip_duration in seconds (randomly correlated with distance in a real scenario, but random here)
        'trip_duration': np.random.randint(300, 3600, n_rows) 
    }
    
    df = pd.DataFrame(data)
    df.to_csv('nyc_taxi_data.csv', index=False)
    print("Saved to nyc_taxi_data.csv")

if __name__ == "__main__":
    generate_nyc_data()