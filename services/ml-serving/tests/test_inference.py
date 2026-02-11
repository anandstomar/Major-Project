import sys
import os
import pytest
from fastapi.testclient import TestClient

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.server import app

client = TestClient(app)

# def test_health_endpoint():
#     """Verify the server starts and returns health status"""
#     response = client.get("/health")
#     assert response.status_code == 200
#     assert response.json()["status"] == "ok"
    

def test_flow():
    # USING 'WITH' TRIGGERS THE LIFESPAN (STARTUP) EVENT
    with TestClient(app) as client:
        
        # 1. Test Health
        resp_health = client.get("/health")
        assert resp_health.status_code == 200
        assert resp_health.json()["status"] == "ok"

        # 2. Test Prediction
        payload = {
            "features": {
                "pickup_datetime": "2016-06-15 14:30:00",
                "pickup_longitude": -73.985,
                "pickup_latitude": 40.758,
                "dropoff_longitude": -73.965,
                "dropoff_latitude": 40.780,
                "passenger_count": 1
            }
        }
        resp_pred = client.post("/predict", json=payload)
        assert resp_pred.status_code == 200
        assert "prediction" in resp_pred.json()

def test_prediction_endpoint():
    """Verify the model can make a prediction with valid input"""
    payload = {
        "features": {
            "pickup_datetime": "2016-06-15 14:30:00",
            "pickup_longitude": -73.985,
            "pickup_latitude": 40.758,
            "dropoff_longitude": -73.965,
            "dropoff_latitude": 40.780,
            "passenger_count": 1
        }
    }
    
    response = client.post("/predict", json=payload)
    
    # Check that we got a success response
    assert response.status_code == 200
    
    # Check that the prediction is a number
    data = response.json()
    assert "prediction" in data
    assert isinstance(data["prediction"], float)
    assert data["prediction"] > 0







# import os
# import joblib
# import numpy as np
# import pandas as pd
# from sklearn.ensemble import RandomForestRegressor

# def test_local_model_prediction(tmp_path):
#     X = pd.DataFrame({"a":[1.0,2.0],"b":[3.0,4.0]})
#     y = [10, 20]
#     model = RandomForestRegressor(n_estimators=5, random_state=1)
#     model.fit(X, y)
#     p = model.predict(pd.DataFrame({"a":[1.5],"b":[3.5]}))
#     assert len(p) == 1
