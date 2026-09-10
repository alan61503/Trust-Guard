from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import os
import json
import joblib
import numpy as np

try:
    from ml.feature_extractor import extract_features
except ImportError:
    from .feature_extractor import extract_features

app = FastAPI()

# Load allowed origin from env
allowed_origin = os.getenv("TRUSTGUARD_EXTENSION_ORIGIN")
if not allowed_origin:
    raise RuntimeError("TRUSTGUARD_EXTENSION_ORIGIN environment variable not set")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[allowed_origin],
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

# Load model and feature order
model_path = os.path.join(os.path.dirname(__file__), "model", "trustguard_model.pkl")
order_path = os.path.join(os.path.dirname(__file__), "model", "feature_order.json")

if not os.path.isfile(model_path) or not os.path.isfile(order_path):
    raise RuntimeError("Model files not found; ensure they exist in ml/model")

model = joblib.load(model_path)
with open(order_path, "r") as f:
    feature_order = json.load(f)

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/predict")
def predict(payload: dict):
    url = payload.get("url")
    if not url:
        raise HTTPException(status_code=400, detail="Missing url")
    # Extract features using the canonical extractor
    feats = extract_features(url)
    # Ensure ordering
    ordered = [feats.get(col) for col in feature_order]
    X = np.array([ordered])
    pred = model.predict(X)[0]
    proba = model.predict_proba(X)[0]
    # Mapping: model 0 = legitimate, 1 = phishing per training
    label = "legitimate" if pred == 0 else "phishing"
    confidence = float(proba[pred])
    phishing_prob = float(proba[1])
    return {
        "prediction": label,
        "confidence": confidence,
        "phishing_probability": phishing_prob,
    }
