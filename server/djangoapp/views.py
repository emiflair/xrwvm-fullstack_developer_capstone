# Uncomment the required imports before adding the code
from .restapis import get_request, analyze_review_sentiments, post_review
from django.shortcuts import render
from django.http import HttpResponseRedirect, HttpResponse
from django.contrib.auth.models import User
from django.shortcuts import get_object_or_404, render, redirect
from django.contrib.auth import logout
from django.contrib import messages
from datetime import datetime

from django.http import JsonResponse
from .models import CarMake, CarModel
from django.contrib.auth import login, authenticate
import logging
import json
from django.views.decorators.csrf import csrf_exempt
from .populate import initiate



# Get an instance of a logger (handy for debugging / audit trails)
logger = logging.getLogger(__name__)


# ---------------------------------------------------------
# login_user: handle sign-in requests from the React client
# ---------------------------------------------------------
@csrf_exempt  # Exempt in the lab; in production you'd use proper CSRF tokens.
def login_user(request):
    """
    Expects JSON:
        {"userName": "<username>", "password": "<password>"}

    Success (200):
        {"userName": "...", "status": "Authenticated"}

    Failure (401):
        {"status": "Unauthorized"}

    Wrong method (405):
        {"detail": "Method not allowed"}
    """

    # For security and clarity, accept POST only for login.
    if request.method != "POST":
        return JsonResponse({"detail": "Method not allowed"}, status=405)

    # Parse the request body safely; return 400 if JSON is invalid.
    try:
        payload = json.loads(request.body or "{}")
    except json.JSONDecodeError:
        return JsonResponse({"detail": "Invalid JSON"}, status=400)

    # The UI sends "userName"; fall back to "username" just in case.
    username = payload.get("userName") or payload.get("username") or ""
    password = payload.get("password") or ""

    # Try authenticating against Django's auth backends.
    user = authenticate(username=username, password=password)

    if user is None:
        # Bad credentials: do not start a session.
        return JsonResponse({"status": "Unauthorized"}, status=401)

    # Good credentials: create a session.
    login(request, user)

    # Return a small success payload that the React app expects.
    return JsonResponse({"userName": username, "status": "Authenticated"})


# ---------------------------------------------------------
# logout_user: handle sign-out requests from the React client
# ---------------------------------------------------------
@csrf_exempt  # Exempt in the lab; in production prefer POST with CSRF.
def logout_user(request):
    """
    Ends the current session.

    For the lab we accept GET or POST for simplicity.

    Success (200):
        {"status": "logged out"}

    Wrong method (405):
        {"detail": "Method not allowed"}
    """

    # Allow GET/POST; reject anything else to be explicit.
    if request.method not in ("GET", "POST"):
        return JsonResponse({"detail": "Method not allowed"}, status=405)

    # End the session (no-op if the user is already anonymous).
    logout(request)

    # Let the client clear its local auth state.
    return JsonResponse({"status": "logged out"})


# Create a `registration` view to handle sign up request
# @csrf_exempt
# def registration(request):
@csrf_exempt
def register_user(request):
    """Create a new user account (sign-up)."""
    if request.method != "POST":
        return JsonResponse({"detail": "Method not allowed"}, status=405)

    # Be lenient with client field names (userName vs username, etc.)
    try:
        data = json.loads(request.body.decode("utf-8"))
    except Exception:
        return JsonResponse({"detail": "Invalid JSON"}, status=400)

    username = data.get("username") or data.get("userName")
    password = data.get("password")
    first_name = data.get("first_name") or data.get("firstName") or ""
    last_name  = data.get("last_name")  or data.get("lastName")  or ""
    email      = data.get("email") or data.get("email") or ""

    if not username or not password:
        return JsonResponse({"detail": "username and password are required"}, status=400)

    if User.objects.filter(username=username).exists():
        return JsonResponse({"status": "exists"}, status=409)

    user = User.objects.create_user(
        username=username,
        password=password,
        first_name=first_name,
        last_name=last_name,
        email=email,
    )
    # Optional: sign the new user in immediately
    login(request, user)

    return JsonResponse({"userName": username, "status": "Registered"}, status=201)


#Update the `get_dealerships` render list of dealerships all by default, particular state if state is passed
def get_dealerships(request, state="All"):
    if(state == "All"):
        endpoint = "/fetchDealers"
    else:
        endpoint = "/fetchDealers/"+state
    dealerships = get_request(endpoint)
    return JsonResponse({"status":200,"dealers":dealerships})


# Create a `get_dealer_reviews` view to render the reviews of a dealer
def get_dealer_reviews(request, dealer_id):
    if not dealer_id:
        return JsonResponse({"status": 400, "message": "Bad Request"})

    # 1) Get reviews from the Node/Mongo API
    endpoint = f"/fetchReviews/dealer/{dealer_id}"
    reviews = get_request(endpoint) or []

    # 2) ↙︎ INSERT THIS ENRICHMENT BLOCK HERE
    enriched = []
    if isinstance(reviews, list):
        for r in reviews:
            txt = (r.get("review") or "").strip()
            result = analyze_review_sentiments(txt) if txt else {}
            r["sentiment"] = (result or {}).get("sentiment", "neutral")
            enriched.append(r)

    # 3) Return JSON
    return JsonResponse({"status": 200, "reviews": enriched})


# Create a `get_dealer_details` view to render the dealer details
def get_dealer_details(request, dealer_id):
    if(dealer_id):
        endpoint = "/fetchDealer/"+str(dealer_id)
        dealership = get_request(endpoint)
        return JsonResponse({"status":200,"dealer":dealership})
    else:
        return JsonResponse({"status":400,"message":"Bad Request"})

# Create a `add_review` view to submit a review
def add_review(request):
    if(request.user.is_anonymous == False):
        data = json.loads(request.body)
        try:
            response = post_review(data)
            return JsonResponse({"status":200})
        except:
            return JsonResponse({"status":401,"message":"Error in posting review"})
    else:
        return JsonResponse({"status":403,"message":"Unauthorized"})


def get_cars(request):
    """Return a list of cars (CarModel + CarMake). Populate DB on first call if empty."""
    if request.method != "GET":
        return JsonResponse({"detail": "Method not allowed"}, status=405)

    # Seed only once if models are empty
    if not CarModel.objects.exists():
        try:
            initiate()
        except Exception as e:
            return JsonResponse({"detail": f"Init failed: {e}"}, status=500)

    car_models = CarModel.objects.select_related("car_make").all()
    cars = [{"CarModel": cm.name, "CarMake": cm.car_make.name} for cm in car_models]
    return JsonResponse({"cars": cars})
