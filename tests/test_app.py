from fastapi.testclient import TestClient
from src.app import app
import urllib.parse

client = TestClient(app)


def test_get_activities():
    resp = client.get("/activities")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, dict)
    assert "Chess Club" in data


def test_signup_and_remove_participant():
    activity = "Chess Club"
    email = "pytest_user@example.com"
    encoded_activity = urllib.parse.quote(activity, safe='')

    # Ensure clean state (ignore errors)
    client.delete(f"/activities/{encoded_activity}/participants?email={urllib.parse.quote(email, safe='')}")

    # Sign up
    res = client.post(f"/activities/{encoded_activity}/signup?email={urllib.parse.quote(email, safe='')}")
    assert res.status_code == 200
    assert "Signed up" in res.json().get("message", "")

    # Verify present
    data = client.get("/activities").json()
    assert email in data[activity]["participants"]

    # Remove
    res2 = client.delete(f"/activities/{encoded_activity}/participants?email={urllib.parse.quote(email, safe='')}")
    assert res2.status_code == 200

    # Verify removed
    data2 = client.get("/activities").json()
    assert email not in data2[activity]["participants"]


def test_remove_nonexistent_returns_404():
    activity = "Chess Club"
    email = "nonexistent@example.com"
    encoded_activity = urllib.parse.quote(activity, safe='')

    # Ensure it's not present
    data = client.get("/activities").json()
    if email in data[activity]["participants"]:
        client.delete(f"/activities/{encoded_activity}/participants?email={urllib.parse.quote(email, safe='')}")

    res = client.delete(f"/activities/{encoded_activity}/participants?email={urllib.parse.quote(email, safe='')}")
    assert res.status_code == 404
