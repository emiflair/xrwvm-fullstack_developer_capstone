# Uncomment the required imports before adding the code

from django.shortcuts import render
from django.http import HttpResponseRedirect, HttpResponse
from django.contrib.auth.models import User
from django.shortcuts import get_object_or_404, render, redirect
from django.contrib.auth import logout
from django.contrib import messages
from datetime import datetime

from django.http import JsonResponse
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

    if not username or not password:
        return JsonResponse({"detail": "username and password are required"}, status=400)

    if User.objects.filter(username=username).exists():
        return JsonResponse({"status": "exists"}, status=409)

    user = User.objects.create_user(
        username=username,
        password=password,
        first_name=first_name,
        last_name=last_name,
    )
    # Optional: sign the new user in immediately
    login(request, user)

    return JsonResponse({"userName": username, "status": "Registered"}, status=201)

# # Update the `get_dealerships` view to render the index page with
# a list of dealerships
# def get_dealerships(request):
# ...

# Create a `get_dealer_reviews` view to render the reviews of a dealer
# def get_dealer_reviews(request,dealer_id):
# ...

# Create a `get_dealer_details` view to render the dealer details
# def get_dealer_details(request, dealer_id):
# ...

# Create a `add_review` view to submit a review
# def add_review(request):
# ...
