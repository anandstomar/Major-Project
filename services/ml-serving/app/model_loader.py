# services/ml-serving/app/model_loader.py
import os
import joblib
import mlflow.pyfunc

class ModelLoader:
    def __init__(self, model_uri=None, local_path="model.pkl"):
        self.model_uri = model_uri
        self.local_path = local_path
        self.model = None

    def load(self):
        # 1. Try loading from MLflow if URI is set
        if self.model_uri:
            try:
                print(f"Loading model from MLflow URI: {self.model_uri}")
                self.model = mlflow.pyfunc.load_model(self.model_uri)
                return self.model
            except Exception as ex:
                print(f"Failed loading from MLflow: {ex}")

        # 2. Fallback to local path (Standard for local dev/Docker)
        if os.path.exists(self.local_path):
            print(f"Loading local model from {self.local_path}")
            self.model = joblib.load(self.local_path)
            return self.model
        
        raise RuntimeError(f"No model found at {self.local_path} or URI {self.model_uri}")





# import os
# import mlflow
# import joblib

# class ModelLoader:
#     def __init__(self, model_uri=None, local_path="/models/model.pkl"):
#         self.model_uri = model_uri
#         self.local_path = local_path
#         self.model = None

#     def load(self):
#         # If model_uri present, try MLflow model download/load
#         if self.model_uri:
#             try:
#                 # mlflow.pyfunc.load_model can load many flavors
#                 print(f"Loading model from MLflow URI: {self.model_uri}")
#                 self.model = mlflow.pyfunc.load_model(self.model_uri)
#                 return self.model
#             except Exception as ex:
#                 print("Failed loading from MLflow:", ex)
#         # fallback to local path
#         if os.path.exists(self.local_path):
#             print("Loading local model from", self.local_path)
#             self.model = joblib.load(self.local_path)
#             return self.model
#         raise RuntimeError("No model found (MLflow or local).")
