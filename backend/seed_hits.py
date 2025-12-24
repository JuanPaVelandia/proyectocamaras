import os
import sys
import random
import json
from datetime import datetime, timedelta

# Add current directory to path
sys.path.append(os.getcwd())

from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.models.all_models import UserDB, RuleDB, EventDB, RuleHitDB, CameraDB
from app.core.security import hash_password

def seed_data():
    db: Session = SessionLocal()
    
    print("🌱 Seeding data...")

    # 1. Create or Get User
    user = db.query(UserDB).filter(UserDB.username == "admin").first()
    if not user:
        print("Creating admin user...")
        user = UserDB(
            username="admin",
            email="admin@frigate.local",
            password_hash=hash_password("Admin123!"),
            is_active=True
        )
        db.add(user)
        db.commit()
    
    print(f"User: {user.username}")

    # 2. Create Cameras
    camera_names = ["Front_Door", "Back_Yard", "Garage_Inside", "Driveway"]
    for name in camera_names:
        cam = db.query(CameraDB).filter(CameraDB.name == name).first()
        if not cam:
            cam = CameraDB(
                name=name,
                description=f"Camera at {name}",
                enabled=True,
                user_id=user.id
            )
            db.add(cam)
    db.commit()

    # 3. Create Rules
    rules = []
    rule_configs = [
        {"name": "Person at Door", "label": "person", "camera": "Front_Door"},
        {"name": "Car in Driveway", "label": "car", "camera": "Driveway"},
        {"name": "Dog in Yard", "label": "dog", "camera": "Back_Yard"},
        {"name": "Unusual Motion", "label": "motion", "camera": "Garage_Inside"}
    ]

    for conf in rule_configs:
        rule = db.query(RuleDB).filter(RuleDB.name == conf["name"]).first()
        if not rule:
            rule = RuleDB(
                name=conf["name"],
                label=conf["label"],
                camera=conf["camera"],
                enabled=True,
                is_deleted=False,
                user_id=user.id,
                min_score=0.7
            )
            db.add(rule)
            db.commit()
            db.refresh(rule)
        rules.append(rule)
    
    # 4. Create Hits (History)
    # Generate hits for the last 30 days
    base_time = datetime.utcnow()
    
    # Check if we already have many hits
    count = db.query(RuleHitDB).count()
    if count > 50:
        print(f"Already have {count} hits. Skipping generation.")
        return

    print("Generating 100 hits...")
    
    for i in range(100):
        # Random rule
        rule = random.choice(rules)
        
        # Random time in last 30 days
        days_ago = random.randint(0, 30)
        minutes_ago = random.randint(0, 1440)
        triggered_at = base_time - timedelta(days=days_ago, minutes=minutes_ago)
        
        # Create Event
        payload = {
            "before": {"label": rule.label},
            "after": {"label": rule.label, "camera": rule.camera, "top_score": random.uniform(0.7, 0.99)},
            "type": "new"
        }
        
        # Simpler payload structure used in hits endpoint:
        # event_payload.get("camera"), event_payload.get("label")...
        simple_payload = {
            "camera": rule.camera,
            "label": rule.label,
            "top_score": random.uniform(0.7, 0.99),
            "frigate_type": "new"
        }

        event = EventDB(
            received_at=triggered_at,
            payload=json.dumps(simple_payload),
            snapshot_base64=None # No real image for dummy
        )
        db.add(event)
        db.commit()
        db.refresh(event)
        
        # Create Hit
        hit = RuleHitDB(
            rule_id=rule.id,
            event_id=event.id,
            triggered_at=triggered_at,
            action="whatsapp"
        )
        db.add(hit)
    
    db.commit()
    print("✅ Seed completed!")

if __name__ == "__main__":
    seed_data()
