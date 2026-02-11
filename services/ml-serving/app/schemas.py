# services/ml-serving/app/schemas.py
from pydantic import BaseModel, Field
from typing import Dict, Any

class PredictRequest(BaseModel):
    # We accept a flexible dict, but the code expects specific keys inside it
    features: Dict[str, Any] = Field(..., example={
        "pickup_datetime": "2016-01-01 12:00:00",
        "pickup_longitude": -73.985,
        "pickup_latitude": 40.758,
        "dropoff_longitude": -73.965,
        "dropoff_latitude": 40.780,
        "passenger_count": 1
    })

class PredictResponse(BaseModel):
    prediction: float

class HealthResponse(BaseModel):
    status: str








# from pydantic import BaseModel, Field
# from typing import Dict, Any

# class PredictRequest(BaseModel):
#     """
#     Generic request schema for model prediction.
#     `features` is a mapping from feature name -> value. Adjust types if you want
#     a stricter schema that exactly matches your dataset.
#     """
#     features: Dict[str, Any] = Field(..., description="Feature name -> value mapping")

# class PredictResponse(BaseModel):
#     prediction: float = Field(..., description="Predicted numeric target")

# class HealthResponse(BaseModel):
#     status: str
