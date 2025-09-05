# restapis.py
import os
import requests
from urllib.parse import urlencode, quote_plus
from dotenv import load_dotenv
from pathlib import Path

# --- Load .env that sits next to this file ---
DOTENV_PATH = Path(__file__).with_name(".env")
load_dotenv(dotenv_path=DOTENV_PATH, override=True)

# --- Read env vars by NAME (must match keys in .env) ---
BACKEND_URL = os.getenv("backend_url", "").strip().rstrip("/")
SENT_URL    = os.getenv("sentiment_analyzer_url", "").strip().rstrip("/") + "/"

# Fail fast if missing
assert BACKEND_URL, "backend_url is not set in server/djangoapp/.env"
assert SENT_URL.strip("/"), "sentiment_analyzer_url is not set in server/djangoapp/.env"

print("[restapis] BACKEND_URL =", BACKEND_URL)
print("[restapis] SENT_URL    =", SENT_URL)


def get_request(endpoint, **params):
    """GET to the Node/Mongo backend."""
    url = f"{BACKEND_URL}{endpoint}"
    if params:
        url = f"{url}?{urlencode(params)}"
    print(f"GET {url}")
    try:
        resp = requests.get(url, timeout=10)
        resp.raise_for_status()
        return resp.json()
    except Exception as e:
        print("Network exception occurred:", e)
        return None


def analyze_review_sentiments(text: str):
    """GET to the sentiment analyzer microservice."""
    url = f"{SENT_URL}analyze/{quote_plus(text or '')}"
    try:
        resp = requests.get(url, timeout=10)
        resp.raise_for_status()
        return resp.json()  # expected: {"sentiment": "..."}
    except Exception as e:
        print("Network exception occurred:", e)
        return {"sentiment": "neutral"}


def post_review(data_dict: dict):
    """POST a review to the backend."""
    url = f"{BACKEND_URL}/insert_review"
    try:
        resp = requests.post(url, json=data_dict, timeout=10)
        resp.raise_for_status()
        return resp.json()
    except Exception as e:
        print("Network exception occurred:", e)
        return {"status": "error"}
