"""
Therapy Sessions Router for SpeechWorks API
Handles session scheduling, management, and SOAP notes
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from typing import List, Optional
from datetime import datetime, date, timedelta

from app.database import get_db
from app.models.models import User, Client, TherapySession, SessionActivity, Activity
from app.schemas.schemas import (
    SessionCreate, SessionUpdate, SessionResponse, SessionStatus,
    SessionActivityCreate, SessionActivityUpdate, SessionActivityResponse
)
from app.services.auth_service import get_current_active_user

router = APIRouter()


@router.get("/", response_model=List[SessionResponse])
def get_sessions(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    client_id: Optional[int] = None,
    status: Optional[SessionStatus] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get therapy sessions for the current therapist.
    
    - **client_id**: Filter by specific client
    - **status**: Filter by session status
    - **start_date**: Sessions from this date
    - **end_date**: Sessions until this date
    """
    query = db.query(TherapySession).filter(
        TherapySession.therapist_id == current_user.id
    )
    
    if client_id:
        query = query.filter(TherapySession.client_id == client_id)
    if status:
        query = query.filter(TherapySession.status == status)
    if start_date:
        query = query.filter(TherapySession.session_date >= datetime.combine(start_date, datetime.min.time()))
    if end_date:
        query = query.filter(TherapySession.session_date <= datetime.combine(end_date, datetime.max.time()))
    
    sessions = query.order_by(TherapySession.session_date.desc()).offset(skip).limit(limit).all()
    return sessions


@router.get("/today", response_model=List[SessionResponse])
def get_today_sessions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get all sessions scheduled for today."""
    today = date.today()
    start_of_day = datetime.combine(today, datetime.min.time())
    end_of_day = datetime.combine(today, datetime.max.time())
    
    sessions = db.query(TherapySession).filter(
        TherapySession.therapist_id == current_user.id,
        TherapySession.session_date >= start_of_day,
        TherapySession.session_date <= end_of_day
    ).order_by(TherapySession.session_date).all()
    
    return sessions


@router.get("/upcoming", response_model=List[SessionResponse])
def get_upcoming_sessions(
    days: int = Query(7, ge=1, le=30),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get upcoming sessions for the next N days."""
    now = datetime.now()
    future = now + timedelta(days=days)
    
    sessions = db.query(TherapySession).filter(
        TherapySession.therapist_id == current_user.id,
        TherapySession.session_date >= now,
        TherapySession.session_date <= future,
        TherapySession.status.in_([SessionStatus.SCHEDULED, SessionStatus.IN_PROGRESS])
    ).order_by(TherapySession.session_date).all()
    
    return sessions


@router.post("/", response_model=SessionResponse, status_code=status.HTTP_201_CREATED)
def create_session(
    session_data: SessionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Schedule a new therapy session.
    
    - **client_id**: ID of the client
    - **session_date**: Date and time of session
    - **duration_minutes**: Session duration (15-180 minutes)
    """
    # Verify client belongs to current user
    client = db.query(Client).filter(
        Client.id == session_data.client_id,
        Client.therapist_id == current_user.id
    ).first()
    
    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client not found"
        )
    
    new_session = TherapySession(
        client_id=session_data.client_id,
        therapist_id=current_user.id,
        session_date=session_data.session_date,
        duration_minutes=session_data.duration_minutes,
        status=SessionStatus.SCHEDULED
    )
    
    db.add(new_session)
    db.commit()
    db.refresh(new_session)
    
    return new_session


@router.get("/{session_id}", response_model=SessionResponse)
def get_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get a specific therapy session."""
    session = db.query(TherapySession).filter(
        TherapySession.id == session_id,
        TherapySession.therapist_id == current_user.id
    ).first()
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    return session


@router.put("/{session_id}", response_model=SessionResponse)
def update_session(
    session_id: int,
    session_data: SessionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Update session details or add SOAP notes.
    
    SOAP Notes:
    - **soap_subjective**: Client's report of symptoms/feelings
    - **soap_objective**: Measurable observations and data
    - **soap_assessment**: Clinical interpretation
    - **soap_plan**: Treatment plan and next steps
    """
    session = db.query(TherapySession).filter(
        TherapySession.id == session_id,
        TherapySession.therapist_id == current_user.id
    ).first()
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    update_data = session_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(session, field, value)
    
    db.commit()
    db.refresh(session)
    
    return session


@router.post("/{session_id}/start", response_model=SessionResponse)
def start_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Mark a session as started/in progress."""
    session = db.query(TherapySession).filter(
        TherapySession.id == session_id,
        TherapySession.therapist_id == current_user.id
    ).first()
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    session.status = SessionStatus.IN_PROGRESS
    db.commit()
    db.refresh(session)
    
    return session


@router.post("/{session_id}/complete", response_model=SessionResponse)
def complete_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Mark a session as completed."""
    session = db.query(TherapySession).filter(
        TherapySession.id == session_id,
        TherapySession.therapist_id == current_user.id
    ).first()
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    session.status = SessionStatus.COMPLETED
    db.commit()
    db.refresh(session)
    
    return session


@router.delete("/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Cancel/delete a therapy session."""
    session = db.query(TherapySession).filter(
        TherapySession.id == session_id,
        TherapySession.therapist_id == current_user.id
    ).first()
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    session.status = SessionStatus.CANCELLED
    db.commit()


# ============== Session Activity Tracking ==============

@router.get("/{session_id}/activities", response_model=List[SessionActivityResponse])
def get_session_activities(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get all activities used in a session with performance data."""
    session = db.query(TherapySession).filter(
        TherapySession.id == session_id,
        TherapySession.therapist_id == current_user.id
    ).first()
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    # Eagerly load activity relationship
    activities = db.query(SessionActivity).filter(
        SessionActivity.session_id == session_id
    ).all()
    
    # Manually load activity for each session activity
    for sa in activities:
        sa.activity = db.query(Activity).filter(Activity.id == sa.activity_id).first()
    
    return activities


@router.post("/{session_id}/activities", response_model=SessionActivityResponse, status_code=status.HTTP_201_CREATED)
def add_session_activity(
    session_id: int,
    activity_data: SessionActivityCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Add an activity to a session with trial data.
    
    - **activity_id**: ID of the therapy activity
    - **trials_attempted**: Number of trials attempted
    - **trials_correct**: Number of correct responses
    - **notes**: Activity-specific notes
    """
    session = db.query(TherapySession).filter(
        TherapySession.id == session_id,
        TherapySession.therapist_id == current_user.id
    ).first()
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    # Verify activity exists
    activity = db.query(Activity).filter(Activity.id == activity_data.activity_id).first()
    if not activity:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Activity not found"
        )
    
    # Calculate accuracy
    accuracy = 0.0
    if activity_data.trials_attempted > 0:
        accuracy = (activity_data.trials_correct / activity_data.trials_attempted) * 100
    
    session_activity = SessionActivity(
        session_id=session_id,
        activity_id=activity_data.activity_id,
        trials_attempted=activity_data.trials_attempted,
        trials_correct=activity_data.trials_correct,
        accuracy_percentage=accuracy,
        notes=activity_data.notes
    )
    
    db.add(session_activity)
    db.commit()
    db.refresh(session_activity)
    
    # Attach activity info for response
    session_activity.activity = activity
    
    return session_activity


@router.put("/{session_id}/activities/{activity_record_id}", response_model=SessionActivityResponse)
def update_session_activity(
    session_id: int,
    activity_record_id: int,
    activity_data: SessionActivityUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update trial data for a session activity."""
    session = db.query(TherapySession).filter(
        TherapySession.id == session_id,
        TherapySession.therapist_id == current_user.id
    ).first()
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    session_activity = db.query(SessionActivity).filter(
        SessionActivity.id == activity_record_id,
        SessionActivity.session_id == session_id
    ).first()
    
    if not session_activity:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Activity record not found"
        )
    
    update_data = activity_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(session_activity, field, value)
    
    # Recalculate accuracy
    if session_activity.trials_attempted > 0:
        session_activity.accuracy_percentage = (
            session_activity.trials_correct / session_activity.trials_attempted
        ) * 100
    
    db.commit()
    db.refresh(session_activity)
    
    return session_activity


@router.delete("/{session_id}/activities/{activity_record_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_session_activity(
    session_id: int,
    activity_record_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Remove an activity from a session."""
    session = db.query(TherapySession).filter(
        TherapySession.id == session_id,
        TherapySession.therapist_id == current_user.id
    ).first()
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    session_activity = db.query(SessionActivity).filter(
        SessionActivity.id == activity_record_id,
        SessionActivity.session_id == session_id
    ).first()
    
    if not session_activity:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Activity record not found"
        )
    
    db.delete(session_activity)
    db.commit()
