import sys
import asyncio

# On Windows with Python 3.13, ProactorEventLoop has an unhandled accept bug on socket resets (WinError 64 / 10054)
# which stops uvicorn from accepting new connections. SelectorEventLoop is resilient.
if sys.platform == "win32":
    try:
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    except Exception:
        pass

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

try:
    from dotenv import load_dotenv
    env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env")
    if os.path.exists(env_path):
        load_dotenv(env_path)
    else:
        load_dotenv()
except ImportError:
    pass

app = FastAPI()

# Configure CORS to permit extension calls, local origins, and preflights
allowed_origin = os.getenv("TRUSTGUARD_EXTENSION_ORIGIN", "chrome-extension://kkjfmdmimmdcmimjnblnoekkfbcihbjo").strip()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "*",
        allowed_origin,
        "chrome-extension://kkjfmdmimmdcmimjnblnoekkfbcihbjo",
        "http://127.0.0.1:8000",
        "http://localhost:8000"
    ],
    allow_origin_regex=r"^chrome-extension://.*$",
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load model and feature order
model_path = os.path.join(os.path.dirname(__file__), "model", "trustguard_model.pkl")
order_path = os.path.join(os.path.dirname(__file__), "model", "feature_order.json")

if not os.path.isfile(model_path) or not os.path.isfile(order_path):
    raise RuntimeError("Model files not found; ensure they exist in ml/model")

model = joblib.load(model_path)
# Ensure single-threaded fast inference without multiprocessing overhead or locks
model.n_jobs = 1
with open(order_path, "r") as f:
    feature_order = json.load(f)

@app.get("/health")
@app.options("/health")
def health():
    return {"status": "ok"}

@app.options("/predict")
def options_predict():
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
