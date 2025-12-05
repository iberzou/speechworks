"""
SpeechWorks - Speech Therapy Treatment Tool
Main FastAPI Application
"""

from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import uvicorn

from app.database import engine, Base, get_db, SessionLocal
from app.routers import auth, clients, sessions, activities, progress, resources
from app.config import settings
from app.models.models import Activity, ActivityCategory

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="SpeechWorks API",
    description="REST API for Speech Therapy Treatment Tool - A comprehensive platform for speech pathologists to manage therapy sessions, track client progress, and deliver interactive treatment activities.",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc"
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(clients.router, prefix="/api/clients", tags=["Clients"])
app.include_router(sessions.router, prefix="/api/sessions", tags=["Therapy Sessions"])
app.include_router(activities.router, prefix="/api/activities", tags=["Therapy Activities"])
app.include_router(progress.router, prefix="/api/progress", tags=["Progress Tracking"])
app.include_router(resources.router, prefix="/api/resources", tags=["Resource Library"])


def seed_sample_activities():
    """Seed the database with sample activities if none exist."""
    db = SessionLocal()
    try:
        # Check if activities already exist
        existing_count = db.query(Activity).count()
        if existing_count > 0:
            return
        
        sample_activities = [
            {
                "id": 1,
                "name": "S Sound Practice - Initial Position",
                "description": "Practice producing the /s/ sound at the beginning of words. Focus on correct tongue placement and airflow.",
                "category": ActivityCategory.ARTICULATION,
                "target_sounds": "s",
                "difficulty_level": 1,
                "instructions": "Show each word card. Have the client say the word 3 times. Model correct production as needed."
            },
            {
                "id": 2,
                "name": "R Sound Practice - Vocalic R",
                "description": "Target vocalic R sounds including -AR, -ER, -IR, -OR, -UR patterns.",
                "category": ActivityCategory.ARTICULATION,
                "target_sounds": "r",
                "difficulty_level": 3,
                "instructions": "Focus on tongue position for vocalic R. Use visual feedback and mirror practice."
            },
            {
                "id": 3,
                "name": "L Sound Practice - All Positions",
                "description": "Comprehensive /l/ sound practice in initial, medial, and final positions.",
                "category": ActivityCategory.ARTICULATION,
                "target_sounds": "l",
                "difficulty_level": 2,
                "instructions": "Emphasize tongue tip placement on alveolar ridge. Practice in isolation before words."
            },
            {
                "id": 4,
                "name": "TH Sound Discrimination",
                "description": "Practice voiced and voiceless TH sounds with minimal pairs.",
                "category": ActivityCategory.ARTICULATION,
                "target_sounds": "th",
                "difficulty_level": 2,
                "instructions": "Demonstrate tongue placement between teeth. Use mirror for visual feedback."
            },
            {
                "id": 5,
                "name": "Naming Common Objects",
                "description": "Expressive naming activity using everyday objects for word retrieval.",
                "category": ActivityCategory.LANGUAGE,
                "target_sounds": None,
                "difficulty_level": 1,
                "instructions": "Show pictures and ask 'What is this?' Allow 5 seconds for response."
            },
            {
                "id": 6,
                "name": "Following Directions",
                "description": "Receptive language activity with 1-step to 3-step directions.",
                "category": ActivityCategory.LANGUAGE,
                "target_sounds": None,
                "difficulty_level": 2,
                "instructions": "Start with simple 1-step directions and gradually increase complexity."
            },
            {
                "id": 7,
                "name": "Sentence Building",
                "description": "Create grammatically correct sentences using word cards.",
                "category": ActivityCategory.LANGUAGE,
                "target_sounds": None,
                "difficulty_level": 2,
                "instructions": "Provide word cards and have client create complete sentences."
            },
            {
                "id": 8,
                "name": "Easy Onset & Slow Speech",
                "description": "Fluency shaping with easy voice onset and reduced speech rate.",
                "category": ActivityCategory.FLUENCY,
                "target_sounds": None,
                "difficulty_level": 2,
                "instructions": "Model slow, stretched speech with gentle voice onset."
            },
            {
                "id": 9,
                "name": "Voice Projection Exercises",
                "description": "Practice producing voice at appropriate loudness levels.",
                "category": ActivityCategory.VOICE,
                "target_sounds": None,
                "difficulty_level": 1,
                "instructions": "Practice sustained vowels and reading passages at varying volumes."
            },
            {
                "id": 10,
                "name": "Minimal Pairs - Final Consonants",
                "description": "Phonological awareness targeting final consonant contrasts.",
                "category": ActivityCategory.PHONOLOGY,
                "target_sounds": None,
                "difficulty_level": 2,
                "instructions": "Present minimal pairs. Have client identify and produce the difference."
            },
            {
                "id": 11,
                "name": "Conversation Skills",
                "description": "Practice initiating and maintaining conversations.",
                "category": ActivityCategory.PRAGMATICS,
                "target_sounds": None,
                "difficulty_level": 2,
                "instructions": "Role-play conversation scenarios. Practice turn-taking and topic maintenance."
            }
        ]
        
        for activity_data in sample_activities:
            activity = Activity(**activity_data)
            db.add(activity)
        
        db.commit()
        print("Sample activities seeded successfully!")
    except Exception as e:
        print(f"Error seeding activities: {e}")
        db.rollback()
    finally:
        db.close()


@app.on_event("startup")
async def startup_event():
    """Run on application startup."""
    seed_sample_activities()


@app.get("/", tags=["Health"])
def root():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "message": "SpeechWorks API is running",
        "version": "1.0.0"
    }

@app.get("/api/health", tags=["Health"])
def health_check(db: Session = Depends(get_db)):
    """Database health check"""
    try:
        db.execute("SELECT 1")
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Database unavailable: {str(e)}")

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
