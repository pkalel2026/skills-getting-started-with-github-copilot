"""
High School Management System API

A super simple FastAPI application that allows students to view and sign up
for extracurricular activities at Mergington High School.
"""

from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse
import os
from pathlib import Path

app = FastAPI(title="Mergington High School API",
              description="API for viewing and signing up for extracurricular activities")

# Mount the static files directory
current_dir = Path(__file__).parent
app.mount("/static", StaticFiles(directory=os.path.join(Path(__file__).parent,
          "static")), name="static")

# In-memory activity database (cleaned)
activities = {
    "Chess Club": {
        "description": "Learn strategies and compete in chess tournaments",
        "schedule": "Fridays, 3:30 PM - 5:00 PM",
        "max_participants": 12,
        "participants": ["michael@mergington.edu", "daniel@mergington.edu"],
    },
    "Volleyball Team": {
        "description": "Competitive volleyball team with regular practices and matches",
        "schedule": "Mondays and Wednesdays, 4:00 PM - 5:30 PM",
        "max_participants": 16,
        "participants": ["harper@mergington.edu", "noah@mergington.edu"],
    },
    "Track and Field": {
        "description": "Sprint, distance and field events training and competitions",
        "schedule": "Tuesdays and Thursdays, 4:00 PM - 6:00 PM",
        "max_participants": 25,
        "participants": ["liam@mergington.edu", "emma@mergington.edu"],
    },
    "Photography Club": {
        "description": "Explore photography techniques, editing, and exhibitions",
        "schedule": "Wednesdays, 3:30 PM - 5:00 PM",
        "max_participants": 20,
        "participants": ["mia@mergington.edu"],
    },
    "Ceramics Studio": {
        "description": "Hands-on pottery and ceramics, glazing and kiln work",
        "schedule": "Fridays, 3:30 PM - 5:30 PM",
        "max_participants": 12,
        "participants": ["olivia@mergington.edu", "lucas@mergington.edu"],
    },
    "Math Club": {
        "description": "Problem-solving, competitions, and math enrichment",
        "schedule": "Thursdays, 3:30 PM - 4:30 PM",
        "max_participants": 18,
        "participants": ["noah@mergington.edu", "ava@mergington.edu"],
    },
    "Science Olympiad": {
        "description": "Prepare for regional science competitions and hands-on labs",
        "schedule": "Mondays, 3:30 PM - 5:00 PM",
        "max_participants": 20,
        "participants": ["ethan@mergington.edu", "sophia@mergington.edu"],
    },
    "Programming Class": {
        "description": "Learn programming fundamentals and build software projects",
        "schedule": "Tuesdays and Thursdays, 3:30 PM - 4:30 PM",
        "max_participants": 20,
        "participants": ["emma@mergington.edu", "sophia@mergington.edu"],
    },
    "Gym Class": {
        "description": "Physical education and sports activities",
        "schedule": "Mondays, Wednesdays, Fridays, 2:00 PM - 3:00 PM",
        "max_participants": 30,
        "participants": ["john@mergington.edu", "olivia@mergington.edu"],
    },
    "Basketball Team": {
        "description": "Competitive basketball team and training",
        "schedule": "Tuesdays and Thursdays, 4:00 PM - 5:30 PM",
        "max_participants": 15,
        "participants": ["alex@mergington.edu"],
    },
    "Soccer League": {
        "description": "Join our competitive soccer league",
        "schedule": "Mondays and Wednesdays, 3:30 PM - 5:00 PM",
        "max_participants": 22,
        "participants": ["james@mergington.edu", "lucy@mergington.edu"],
    },
    "Drama Club": {
        "description": "Perform in school plays and theatrical productions",
        "schedule": "Wednesdays, 4:00 PM - 5:30 PM",
        "max_participants": 25,
        "participants": ["sarah@mergington.edu"],
    },
    "Art Studio": {
        "description": "Explore painting, drawing, and sculpture",
        "schedule": "Fridays, 3:30 PM - 5:00 PM",
        "max_participants": 18,
        "participants": ["mia@mergington.edu", "lucas@mergington.edu"],
    },
    "Robotics Club": {
        "description": "Design and build robots for competitions",
        "schedule": "Mondays and Fridays, 3:30 PM - 5:00 PM",
        "max_participants": 16,
        "participants": ["ethan@mergington.edu"],
    },
    "Debate Team": {
        "description": "Develop public speaking and argumentation skills",
        "schedule": "Thursdays, 3:30 PM - 5:00 PM",
        "max_participants": 20,
        "participants": ["noah@mergington.edu", "ava@mergington.edu"],
    },
}


@app.get("/")
def root():
    return RedirectResponse(url="/static/index.html")


@app.get("/activities")
def get_activities():
    return activities


@app.post("/activities/{activity_name}/signup")
def signup_for_activity(activity_name: str, email: str):
    """Sign up a student for an activity"""
    # Validate activity exists
    if activity_name not in activities:
        raise HTTPException(status_code=404, detail="Activity not found")

    activity = activities[activity_name]

    # Validate student is not already signed up
    if email in activity.get("participants", []):
        raise HTTPException(status_code=400, detail="Student already signed up")

    # Validate capacity
    if len(activity.get("participants", [])) >= activity.get("max_participants", 0):
        raise HTTPException(status_code=400, detail="Activity is full")

    # Add student
    activity.setdefault("participants", []).append(email)
    return {"message": f"Signed up {email} for {activity_name}"}


@app.delete("/activities/{activity_name}/participants")
def remove_participant(activity_name: str, email: str):
    """Unregister a student (by email) from an activity."""
    if activity_name not in activities:
        raise HTTPException(status_code=404, detail="Activity not found")

    activity = activities[activity_name]
    participants = activity.get("participants", [])

    if email not in participants:
        raise HTTPException(status_code=404, detail="Participant not found in activity")

    participants.remove(email)
    return {"message": f"Removed {email} from {activity_name}"}
