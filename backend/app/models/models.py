"""
Database Models for SpeechWorks Speech Therapy Platform
"""

from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, ForeignKey, Float, Enum, Date
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import enum

# Enumerations
class UserRole(str, enum.Enum):
    THERAPIST = "therapist"
    ADMIN = "admin"
    SUPERVISOR = "supervisor"

class SessionStatus(str, enum.Enum):
    SCHEDULED = "scheduled"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

class ActivityCategory(str, enum.Enum):
    ARTICULATION = "articulation"
    LANGUAGE = "language"
    FLUENCY = "fluency"
    VOICE = "voice"
    PRAGMATICS = "pragmatics"
    PHONOLOGY = "phonology"

class GoalStatus(str, enum.Enum):
    NOT_STARTED = "not_started"
    IN_PROGRESS = "in_progress"
    MASTERED = "mastered"
    DISCONTINUED = "discontinued"


class User(Base):
    """Therapist/Admin user accounts"""
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(100), nullable=False)
    license_number = Column(String(50))
    role = Column(Enum(UserRole), default=UserRole.THERAPIST)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    clients = relationship("Client", back_populates="therapist")
    sessions = relationship("TherapySession", back_populates="therapist")


class Client(Base):
    """Client/Patient profiles"""
    __tablename__ = "clients"
    
    id = Column(Integer, primary_key=True, index=True)
    therapist_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    first_name = Column(String(50), nullable=False)
    last_name = Column(String(50), nullable=False)
    date_of_birth = Column(Date, nullable=False)
    diagnosis = Column(Text)
    notes = Column(Text)
    contact_email = Column(String(255))
    contact_phone = Column(String(20))
    guardian_name = Column(String(100))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    therapist = relationship("User", back_populates="clients")
    sessions = relationship("TherapySession", back_populates="client")
    goals = relationship("TreatmentGoal", back_populates="client")
    progress_records = relationship("ProgressRecord", back_populates="client")


class TreatmentGoal(Base):
    """Treatment goals for clients"""
    __tablename__ = "treatment_goals"
    
    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    category = Column(Enum(ActivityCategory), nullable=False)
    description = Column(Text, nullable=False)
    target_accuracy = Column(Integer, default=80)  # Percentage
    current_accuracy = Column(Integer, default=0)
    status = Column(Enum(GoalStatus), default=GoalStatus.NOT_STARTED)
    target_date = Column(Date)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    client = relationship("Client", back_populates="goals")


class TherapySession(Base):
    """Therapy session records"""
    __tablename__ = "therapy_sessions"
    
    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    therapist_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    session_date = Column(DateTime(timezone=True), nullable=False)
    duration_minutes = Column(Integer, default=30)
    status = Column(Enum(SessionStatus), default=SessionStatus.SCHEDULED)
    session_notes = Column(Text)
    soap_subjective = Column(Text)
    soap_objective = Column(Text)
    soap_assessment = Column(Text)
    soap_plan = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    client = relationship("Client", back_populates="sessions")
    therapist = relationship("User", back_populates="sessions")
    activities_used = relationship("SessionActivity", back_populates="session")


class Activity(Base):
    """Therapy activities and exercises"""
    __tablename__ = "activities"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    description = Column(Text)
    category = Column(Enum(ActivityCategory), nullable=False)
    instructions = Column(Text)
    target_sounds = Column(String(100))  # For articulation activities
    difficulty_level = Column(Integer, default=1)  # 1-5
    materials_needed = Column(Text)
    image_url = Column(String(500))  # S3 URL
    audio_url = Column(String(500))  # S3 URL for audio prompts
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    session_uses = relationship("SessionActivity", back_populates="activity")
    word_list = relationship("ActivityWord", back_populates="activity")


class ActivityWord(Base):
    """Words/stimuli for activities"""
    __tablename__ = "activity_words"
    
    id = Column(Integer, primary_key=True, index=True)
    activity_id = Column(Integer, ForeignKey("activities.id"), nullable=False)
    word = Column(String(100), nullable=False)
    phonetic = Column(String(100))
    image_url = Column(String(500))
    audio_url = Column(String(500))
    position = Column(String(20))  # initial, medial, final
    syllables = Column(Integer)
    
    # Relationships
    activity = relationship("Activity", back_populates="word_list")


class SessionActivity(Base):
    """Junction table for sessions and activities with performance data"""
    __tablename__ = "session_activities"
    
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("therapy_sessions.id"), nullable=False)
    activity_id = Column(Integer, ForeignKey("activities.id"), nullable=False)
    trials_attempted = Column(Integer, default=0)
    trials_correct = Column(Integer, default=0)
    accuracy_percentage = Column(Float, default=0.0)
    notes = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    session = relationship("TherapySession", back_populates="activities_used")
    activity = relationship("Activity", back_populates="session_uses")


class ProgressRecord(Base):
    """Track client progress over time"""
    __tablename__ = "progress_records"
    
    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    goal_id = Column(Integer, ForeignKey("treatment_goals.id"))
    record_date = Column(Date, nullable=False)
    category = Column(Enum(ActivityCategory), nullable=False)
    accuracy_percentage = Column(Float, nullable=False)
    trials_total = Column(Integer, default=0)
    notes = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    client = relationship("Client", back_populates="progress_records")


class Resource(Base):
    """Therapy resource library"""
    __tablename__ = "resources"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    description = Column(Text)
    category = Column(Enum(ActivityCategory))
    resource_type = Column(String(50))  # worksheet, flashcard, guide, video
    file_url = Column(String(500))  # S3 URL
    thumbnail_url = Column(String(500))
    uploaded_by = Column(Integer, ForeignKey("users.id"))
    is_public = Column(Boolean, default=True)
    download_count = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
