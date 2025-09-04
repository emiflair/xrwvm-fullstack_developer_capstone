# Uncomment the imports below before you add the function code
# restapis.py
import os
import requests
from urllib.parse import urlencode, quote_plus
from dotenv import load_dotenv

load_dotenv()

BACKEND_URL = os.getenv('backend_url', 'https://emifeaustin0-3030.theiadockernext-0-labs-prod-theiak8s-4-tor01.proxy.cognitiveclass.ai').rstrip('/')
SENT_URL    = os.getenv('sentiment_analyzer_url', 'https://emifeaustin0-5050.theiadockernext-0-labs-prod-theiak8s-4-tor01.proxy.cognitiveclass.ai').rstrip('/') + '/'

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


# Add code for posting review
