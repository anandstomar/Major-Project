import os
import time
import uvicorn
import pandas as pd
import numpy as np
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.responses import Response
from prometheus_client import Counter, Histogram, generate_latest, CONTENT_TYPE_LATEST

from app.schemas import PredictRequest, PredictResponse, HealthResponse
from app.model_loader import ModelLoader

# Prometheus metrics
PREDICTIONS = Counter('ml_serving_predictions_total', 'Number of predictions')
PREDICTION_TIME = Histogram('ml_serving_prediction_seconds', 'Prediction latency')

# Load Model Configuration
MODEL_PATH = os.environ.get("MODEL_PATH", "model.pkl") 
loader = ModelLoader(local_path=MODEL_PATH)

# --- LIFESPAN MANAGER (Fixes the Test Error) ---
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Load the model when the app starts
    loader.load()
    app.state.model = loader.model
    print(f"Model loaded: {app.state.model is not None}")
    yield
    # (Optional) Clean up when app stops
    print("Shutting down ML service")

# Initialize App with lifespan
app = FastAPI(title="ML Trip Time Estimator", lifespan=lifespan)

# --- Feature Engineering ---
def haversine_array(lat1, lng1, lat2, lng2):
    lat1, lng1, lat2, lng2 = map(np.radians, (lat1, lng1, lat2, lng2))
    AVG_EARTH_RADIUS = 6371
    lat = lat2 - lat1
    lng = lng2 - lng1
    d = np.sin(lat * 0.5) ** 2 + np.cos(lat1) * np.cos(lat2) * np.sin(lng * 0.5) ** 2
    h = 2 * AVG_EARTH_RADIUS * np.arcsin(np.sqrt(d))
    return h

def preprocess_features(raw_features: dict) -> pd.DataFrame:
    df = pd.DataFrame([raw_features])
    df['pickup_datetime'] = pd.to_datetime(df['pickup_datetime'])
    df['month'] = df['pickup_datetime'].dt.month
    df['day_of_week'] = df['pickup_datetime'].dt.dayofweek
    df['hour'] = df['pickup_datetime'].dt.hour
    df['distance_km'] = haversine_array(
        df['pickup_latitude'], df['pickup_longitude'],
        df['dropoff_latitude'], df['dropoff_longitude']
    )
    required_cols = [
        'passenger_count', 'pickup_longitude', 'pickup_latitude', 
        'dropoff_longitude', 'dropoff_latitude', 'month', 'day_of_week', 'hour', 'distance_km'
    ]
    return df[required_cols]

# --- Routes ---
@app.get("/health", response_model=HealthResponse)
def health():
    # Check if model is actually loaded
    is_loaded = hasattr(app.state, 'model') and app.state.model is not None
    return {"status": "ok" if is_loaded else "error"}

@app.get("/metrics")
def metrics():
    return Response(content=generate_latest(), media_type=CONTENT_TYPE_LATEST)

@app.post("/predict", response_model=PredictResponse)
def predict(req: PredictRequest):
    if not hasattr(app.state, 'model') or app.state.model is None:
        raise HTTPException(status_code=503, detail="Model not loaded")
    
    try:
        start = time.time()
        X = preprocess_features(req.features)
        pred = app.state.model.predict(X)[0]
        duration = time.time() - start
        
        PREDICTIONS.inc()
        PREDICTION_TIME.observe(duration)
        
        return {"prediction": float(pred)}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

if __name__ == "__main__":
    uvicorn.run("app.server:app", host="0.0.0.0", port=int(os.environ.get("PORT", "8080")))







# import os
# import uvicorn
# from fastapi import FastAPI, HTTPException
# from pydantic import BaseModel
# from prometheus_client import Counter, Histogram, generate_latest, CONTENT_TYPE_LATEST
# from fastapi.responses import Response
# from .schemas import PredictRequest, PredictResponse, HealthResponse
# from .model_loader import ModelLoader
# import typing as t

# app = FastAPI(title="ML Trip Time Estimator")

# # Prometheus metrics
# PREDICTIONS = Counter('ml_serving_predictions_total', 'Number of predictions')
# PREDICTION_TIME = Histogram('ml_serving_prediction_seconds', 'Prediction latency')

# # load model at startup
# MODEL_URI = os.environ.get("MODEL_URI")  # e.g. "mlflow:/models/trip-time-estimator/Production" or None
# MODEL_PATH = os.environ.get("MODEL_PATH", "/models/model.pkl")  # fallback
# loader = ModelLoader(model_uri=MODEL_URI, local_path=MODEL_PATH)

# class PredictRequest(BaseModel):
#     # Example: flexible dict of features
#     features: dict

# class PredictResponse(BaseModel):
#     prediction: float

# @app.on_event("startup")
# def startup_event():
#     loader.load()
#     app.state.model = loader.model

# @app.get("/health", response_model=HealthResponse)
# def health():
#     return {"status": "ok"}

# @app.get("/metrics")
# def metrics():
#     data = generate_latest()
#     return Response(content=data, media_type=CONTENT_TYPE_LATEST)

# @app.post("/predict", response_model=PredictResponse)
# def predict(req: PredictRequest):
#     model = app.state.model
#     if model is None:
#         raise HTTPException(status_code=503, detail="Model not loaded")
#     # convert features -> single-row DataFrame
#     import pandas as pd
#     X = pd.DataFrame([req.features])
#     import time
#     start = time.time()
#     pred = model.predict(X)[0]
#     duration = time.time() - start
#     PREDICTIONS.inc()
#     PREDICTION_TIME.observe(duration)
#     return {"prediction": float(pred)}

# if __name__ == "__main__":
#     uvicorn.run("app.server:app", host="0.0.0.0", port=int(os.environ.get("PORT", "8080")), reload=False)
