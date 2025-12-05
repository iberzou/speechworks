"""
Progress Tracking Router for SpeechWorks API
Handles client progress recording and analytics
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from typing import List, Optional
from datetime import date, timedelta

from app.database import get_db
from app.models.models import User, Client, ProgressRecord, TreatmentGoal, TherapySession, SessionActivity
from app.schemas.schemas import (
    ProgressCreate, ProgressResponse, ProgressSummary,
    ActivityCategory, DashboardStats, ClientProgressChart
)
from app.services.auth_service import get_current_active_user

router = APIRouter()


@router.get("/dashboard", response_model=DashboardStats)
def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get dashboard statistics for the therapist."""
    from datetime import datetime
    
    # Total clients
    total_clients = db.query(Client).filter(
        Client.therapist_id == current_user.id,
        Client.is_active == True
    ).count()
    
    # Today's sessions
    today = date.today()
    today_start = datetime.combine(today, datetime.min.time())
    today_end = datetime.combine(today, datetime.max.time())
    
    active_sessions_today = db.query(TherapySession).filter(
        TherapySession.therapist_id == current_user.id,
        TherapySession.session_date >= today_start,
        TherapySession.session_date <= today_end
    ).count()
    
    # This week's sessions
    week_start = today - timedelta(days=today.weekday())
    week_end = week_start + timedelta(days=6)
    
    sessions_this_week = db.query(TherapySession).filter(
        TherapySession.therapist_id == current_user.id,
        TherapySession.session_date >= datetime.combine(week_start, datetime.min.time()),
        TherapySession.session_date <= datetime.combine(week_end, datetime.max.time())
    ).count()
    
    # Average accuracy this week
    avg_accuracy = db.query(func.avg(SessionActivity.accuracy_percentage)).join(
        TherapySession
    ).filter(
        TherapySession.therapist_id == current_user.id,
        TherapySession.session_date >= datetime.combine(week_start, datetime.min.time())
    ).scalar() or 0.0
    
    return DashboardStats(
        total_clients=total_clients,
        active_sessions_today=active_sessions_today,
        sessions_this_week=sessions_this_week,
        avg_accuracy_this_week=round(avg_accuracy, 1)
    )


@router.get("/client/{client_id}", response_model=List[ProgressResponse])
def get_client_progress(
    client_id: int,
    category: Optional[ActivityCategory] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get progress records for a specific client.
    
    - **category**: Filter by therapy category
    - **start_date**: Records from this date
    - **end_date**: Records until this date
    """
    # Verify client belongs to current user
    client = db.query(Client).filter(
        Client.id == client_id,
        Client.therapist_id == current_user.id
    ).first()
    
    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client not found"
        )
    
    query = db.query(ProgressRecord).filter(ProgressRecord.client_id == client_id)
    
    if category:
        query = query.filter(ProgressRecord.category == category)
    if start_date:
        query = query.filter(ProgressRecord.record_date >= start_date)
    if end_date:
        query = query.filter(ProgressRecord.record_date <= end_date)
    
    records = query.order_by(desc(ProgressRecord.record_date)).limit(limit).all()
    return records


@router.get("/client/{client_id}/summary", response_model=List[ProgressSummary])
def get_client_progress_summary(
    client_id: int,
    days: int = Query(30, ge=7, le=365),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get progress summary by category for a client.
    
    Shows average accuracy, total sessions, and improvement trend.
    """
    # Verify client belongs to current user
    client = db.query(Client).filter(
        Client.id == client_id,
        Client.therapist_id == current_user.id
    ).first()
    
    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client not found"
        )
    
    cutoff_date = date.today() - timedelta(days=days)
    midpoint_date = date.today() - timedelta(days=days // 2)
    
    summaries = []
    
    # Get categories with data
    categories = db.query(ProgressRecord.category).filter(
        ProgressRecord.client_id == client_id,
        ProgressRecord.record_date >= cutoff_date
    ).distinct().all()
    
    for (category,) in categories:
        # Average accuracy
        avg_accuracy = db.query(func.avg(ProgressRecord.accuracy_percentage)).filter(
            ProgressRecord.client_id == client_id,
            ProgressRecord.category == category,
            ProgressRecord.record_date >= cutoff_date
        ).scalar() or 0.0
        
        # Total sessions
        total_sessions = db.query(ProgressRecord).filter(
            ProgressRecord.client_id == client_id,
            ProgressRecord.category == category,
            ProgressRecord.record_date >= cutoff_date
        ).count()
        
        # Calculate improvement trend (compare first half to second half)
        first_half_avg = db.query(func.avg(ProgressRecord.accuracy_percentage)).filter(
            ProgressRecord.client_id == client_id,
            ProgressRecord.category == category,
            ProgressRecord.record_date >= cutoff_date,
            ProgressRecord.record_date < midpoint_date
        ).scalar() or 0.0
        
        second_half_avg = db.query(func.avg(ProgressRecord.accuracy_percentage)).filter(
            ProgressRecord.client_id == client_id,
            ProgressRecord.category == category,
            ProgressRecord.record_date >= midpoint_date
        ).scalar() or 0.0
        
        improvement = second_half_avg - first_half_avg
        
        summaries.append(ProgressSummary(
            category=category,
            avg_accuracy=round(avg_accuracy, 1),
            total_sessions=total_sessions,
            improvement_trend=round(improvement, 1)
        ))
    
    return summaries


@router.get("/client/{client_id}/chart", response_model=ClientProgressChart)
def get_client_progress_chart(
    client_id: int,
    category: ActivityCategory,
    days: int = Query(30, ge=7, le=365),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get chart data for client progress over time.
    
    Returns dates and accuracy values for charting.
    """
    # Verify client belongs to current user
    client = db.query(Client).filter(
        Client.id == client_id,
        Client.therapist_id == current_user.id
    ).first()
    
    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client not found"
        )
    
    cutoff_date = date.today() - timedelta(days=days)
    
    records = db.query(ProgressRecord).filter(
        ProgressRecord.client_id == client_id,
        ProgressRecord.category == category,
        ProgressRecord.record_date >= cutoff_date
    ).order_by(ProgressRecord.record_date).all()
    
    dates = [record.record_date.isoformat() for record in records]
    accuracy_values = [record.accuracy_percentage for record in records]
    
    return ClientProgressChart(
        dates=dates,
        accuracy_values=accuracy_values,
        category=category
    )


@router.post("/", response_model=ProgressResponse, status_code=status.HTTP_201_CREATED)
def create_progress_record(
    progress_data: ProgressCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Create a new progress record for a client.
    
    - **client_id**: ID of the client
    - **goal_id**: Optional linked treatment goal
    - **record_date**: Date of the record
    - **category**: Therapy category
    - **accuracy_percentage**: Accuracy achieved (0-100)
    - **trials_total**: Total number of trials
    - **notes**: Additional notes
    """
    # Verify client belongs to current user
    client = db.query(Client).filter(
        Client.id == progress_data.client_id,
        Client.therapist_id == current_user.id
    ).first()
    
    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client not found"
        )
    
    # Verify goal if provided
    if progress_data.goal_id:
        goal = db.query(TreatmentGoal).filter(
            TreatmentGoal.id == progress_data.goal_id,
            TreatmentGoal.client_id == progress_data.client_id
        ).first()
        
        if not goal:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Goal not found"
            )
        
        # Update goal's current accuracy
        goal.current_accuracy = int(progress_data.accuracy_percentage)
    
    new_record = ProgressRecord(**progress_data.model_dump())
    
    db.add(new_record)
    db.commit()
    db.refresh(new_record)
    
    return new_record


@router.delete("/{record_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_progress_record(
    record_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Delete a progress record."""
    record = db.query(ProgressRecord).filter(ProgressRecord.id == record_id).first()
    
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Progress record not found"
        )
    
    # Verify client belongs to current user
    client = db.query(Client).filter(
        Client.id == record.client_id,
        Client.therapist_id == current_user.id
    ).first()
    
    if not client:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete this record"
        )
    
    db.delete(record)
    db.commit()
