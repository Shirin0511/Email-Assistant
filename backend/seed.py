import json
from datetime import datetime
from database import SessionLocal, engine, Base
from models import Email

def seed():
    Base.metadata.create_all(bind=engine)   # creates the table if missing
    with open("emails.json", encoding="utf-8") as f:
        data = json.load(f)

    with SessionLocal() as db:
        for item in data:
            item["timestamp"] = datetime.fromisoformat(item["timestamp"])
            db.merge(Email(**item))          # insert, or update if id exists
        db.commit()

if __name__ == "__main__":
    seed()
