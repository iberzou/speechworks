"""
Pydantic Schemas for SpeechWorks API
Request/Response validation and serialization
"""

from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime, date
from enum import Enum

# Enumerations
class UserRole(str, Enum):
    THERAPIST = "therapist"
    ADMIN = "admin"
    SUPERVISOR = "supervisor"

class SessionStatus(str, Enum):
    SCHEDULED = "scheduled"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

class ActivityCategory(str, Enum):
    ARTICULATION = "articulation"
    LANGUAGE = "language"
    FLUENCY = "fluency"
    VOICE = "voice"
    PRAGMATICS = "pragmatics"
    PHONOLOGY = "phonology"

class GoalStatus(str, Enum):
    NOT_STARTED = "not_started"
    IN_PROGRESS = "in_progress"
    MASTERED = "mastered"
    DISCONTINUED = "discontinued"


# ============== Authentication Schemas ==============

class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)
    full_name: str = Field(..., min_length=2, max_length=100)
    license_number: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: int
    email: str
    full_name: str
    license_number: Optional[str]
    role: UserRole
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


# ============== Client Schemas ==============

class ClientBase(BaseModel):
    first_name: str = Field(..., min_length=1, max_length=50)
    last_name: str = Field(..., min_length=1, max_length=50)
    date_of_birth: date
    diagnosis: Optional[str] = None
    notes: Optional[str] = None
    contact_email: Optional[EmailStr] = None
    contact_phone: Optional[str] = None
    guardian_name: Optional[str] = None

class ClientCreate(ClientBase):
    pass

class ClientUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    date_of_birth: Optional[date] = None
    diagnosis: Optional[str] = None
    notes: Optional[str] = None
    contact_email: Optional[EmailStr] = None
    contact_phone: Optional[str] = None
    guardian_name: Optional[str] = None
    is_active: Optional[bool] = None

class ClientResponse(ClientBase):
    id: int
    therapist_id: int
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime]
    
    class Config:
        from_attributes = True

class ClientWithGoals(ClientResponse):
    goals: List["GoalResponse"] = []
    
    class Config:
        from_attributes = True


# ============== Treatment Goal Schemas ==============

class GoalBase(BaseModel):
    category: ActivityCategory
    description: str
    target_accuracy: int = Field(default=80, ge=0, le=100)
    target_date: Optional[date] = None

class GoalCreate(GoalBase):
    pass

class GoalUpdate(BaseModel):
    description: Optional[str] = None
    target_accuracy: Optional[int] = None
    current_accuracy: Optional[int] = None
    status: Optional[GoalStatus] = None
    target_date: Optional[date] = None

class GoalResponse(GoalBase):
    id: int
    client_id: int
    current_accuracy: int
    status: GoalStatus
    created_at: datetime
    
    class Config:
        from_attributes = True


# ============== Therapy Session Schemas ==============

class SessionBase(BaseModel):
    client_id: int
    session_date: datetime
    duration_minutes: int = Field(default=30, ge=15, le=180)

class SessionCreate(SessionBase):
    pass

class SessionUpdate(BaseModel):
    session_date: Optional[datetime] = None
    duration_minutes: Optional[int] = None
    status: Optional[SessionStatus] = None
    session_notes: Optional[str] = None
    soap_subjective: Optional[str] = None
    soap_objective: Optional[str] = None
    soap_assessment: Optional[str] = None
    soap_plan: Optional[str] = None

class SessionResponse(SessionBase):
    id: int
    therapist_id: int
    status: SessionStatus
    session_notes: Optional[str]
    soap_subjective: Optional[str]
    soap_objective: Optional[str]
    soap_assessment: Optional[str]
    soap_plan: Optional[str]
    created_at: datetime
    
    class Config:
        from_attributes = True


# ============== Activity Schemas ==============

class ActivityWordBase(BaseModel):
    word: str
    phonetic: Optional[str] = None
    image_url: Optional[str] = None
    audio_url: Optional[str] = None
    position: Optional[str] = None
    syllables: Optional[int] = None

class ActivityWordCreate(ActivityWordBase):
    activity_id: int

class ActivityWordResponse(ActivityWordBase):
    id: int
    activity_id: int
    
    class Config:
        from_attributes = True

class ActivityBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None
    category: ActivityCategory
    instructions: Optional[str] = None
    target_sounds: Optional[str] = None
    difficulty_level: int = Field(default=1, ge=1, le=5)
    materials_needed: Optional[str] = None

class ActivityCreate(ActivityBase):
    pass

class ActivityUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    instructions: Optional[str] = None
    target_sounds: Optional[str] = None
    difficulty_level: Optional[int] = None
    materials_needed: Optional[str] = None
    is_active: Optional[bool] = None

class ActivityResponse(ActivityBase):
    id: int
    image_url: Optional[str]
    audio_url: Optional[str]
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

class ActivityWithWords(ActivityResponse):
    word_list: List[ActivityWordResponse] = []
    
    class Config:
        from_attributes = True


# ============== Session Activity Schemas ==============

class ActivityBrief(BaseModel):
    """Brief activity info for embedding in session activity response"""
    id: int
    name: str
    category: ActivityCategory
    
    class Config:
        from_attributes = True

class SessionActivityCreate(BaseModel):
    activity_id: int
    trials_attempted: int = Field(default=0, ge=0)
    trials_correct: int = Field(default=0, ge=0)
    notes: Optional[str] = None

class SessionActivityUpdate(BaseModel):
    trials_attempted: Optional[int] = None
    trials_correct: Optional[int] = None
    notes: Optional[str] = None

class SessionActivityResponse(BaseModel):
    id: int
    session_id: int
    activity_id: int
    trials_attempted: int
    trials_correct: int
    accuracy_percentage: float
    notes: Optional[str]
    created_at: datetime
    activity: Optional[ActivityBrief] = None
    
    class Config:
        from_attributes = True


# ============== Progress Schemas ==============

class ProgressCreate(BaseModel):
    client_id: int
    goal_id: Optional[int] = None
    record_date: date
    category: ActivityCategory
    accuracy_percentage: float = Field(..., ge=0, le=100)
    trials_total: int = Field(default=0, ge=0)
    notes: Optional[str] = None

class ProgressResponse(BaseModel):
    id: int
    client_id: int
    goal_id: Optional[int]
    record_date: date
    category: ActivityCategory
    accuracy_percentage: float
    trials_total: int
    notes: Optional[str]
    created_at: datetime
    
    class Config:
        from_attributes = True

class ProgressSummary(BaseModel):
    category: ActivityCategory
    avg_accuracy: float
    total_sessions: int
    improvement_trend: float  # Percentage change


# ============== Resource Schemas ==============

class ResourceCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    category: Optional[ActivityCategory] = None
    resource_type: str
    is_public: bool = True

class ResourceResponse(BaseModel):
    id: int
    title: str
    description: Optional[str]
    category: Optional[ActivityCategory]
    resource_type: str
    file_url: Optional[str]
    thumbnail_url: Optional[str]
    is_public: bool
    download_count: int
    created_at: datetime
    
    class Config:
        from_attributes = True


# ============== Dashboard Schemas ==============

class DashboardStats(BaseModel):
    total_clients: int
    active_sessions_today: int
    sessions_this_week: int
    avg_accuracy_this_week: float

class ClientProgressChart(BaseModel):
    dates: List[str]
    accuracy_values: List[float]
    category: ActivityCategory


# Update forward references
ClientWithGoals.model_rebuild()
ActivityWithWords.model_rebuild()
