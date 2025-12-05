"""
Clients Router for SpeechWorks API
Handles client/patient management and treatment goals
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List, Optional
from datetime import date

from app.database import get_db
from app.models.models import User, Client, TreatmentGoal
from app.schemas.schemas import (
    ClientCreate, ClientUpdate, ClientResponse, ClientWithGoals,
    GoalCreate, GoalUpdate, GoalResponse, ActivityCategory, GoalStatus
)
from app.services.auth_service import get_current_active_user

router = APIRouter()


# ============== Client Endpoints ==============

@router.get("/", response_model=List[ClientResponse])
def get_clients(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    search: Optional[str] = None,
    is_active: Optional[bool] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get all clients for the current therapist.
    
    - **skip**: Number of records to skip (pagination)
    - **limit**: Maximum records to return (max 100)
    - **search**: Search by name
    - **is_active**: Filter by active status
    """
    query = db.query(Client).filter(Client.therapist_id == current_user.id)
    
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                Client.first_name.ilike(search_term),
                Client.last_name.ilike(search_term)
            )
        )
    
    if is_active is not None:
        query = query.filter(Client.is_active == is_active)
    
    clients = query.offset(skip).limit(limit).all()
    return clients


@router.post("/", response_model=ClientResponse, status_code=status.HTTP_201_CREATED)
def create_client(
    client_data: ClientCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Create a new client profile.
    
    - **first_name**: Client's first name
    - **last_name**: Client's last name
    - **date_of_birth**: Birth date (YYYY-MM-DD)
    - **diagnosis**: Speech/language diagnosis
    - **notes**: Additional notes
    - **contact_email**: Parent/guardian email
    - **contact_phone**: Contact phone number
    - **guardian_name**: Parent/guardian name
    """
    new_client = Client(
        therapist_id=current_user.id,
        **client_data.model_dump()
    )
    
    db.add(new_client)
    db.commit()
    db.refresh(new_client)
    
    return new_client


@router.get("/{client_id}", response_model=ClientWithGoals)
def get_client(
    client_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get a specific client's profile with their treatment goals.
    """
    client = db.query(Client).filter(
        Client.id == client_id,
        Client.therapist_id == current_user.id
    ).first()
    
    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client not found"
        )
    
    return client


@router.put("/{client_id}", response_model=ClientResponse)
def update_client(
    client_id: int,
    client_data: ClientUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Update a client's profile information.
    """
    client = db.query(Client).filter(
        Client.id == client_id,
        Client.therapist_id == current_user.id
    ).first()
    
    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client not found"
        )
    
    update_data = client_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(client, field, value)
    
    db.commit()
    db.refresh(client)
    
    return client


@router.delete("/{client_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_client(
    client_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Soft delete a client (sets is_active to False).
    Client data is preserved for records.
    """
    client = db.query(Client).filter(
        Client.id == client_id,
        Client.therapist_id == current_user.id
    ).first()
    
    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client not found"
        )
    
    client.is_active = False
    db.commit()


# ============== Treatment Goal Endpoints ==============

@router.get("/{client_id}/goals", response_model=List[GoalResponse])
def get_client_goals(
    client_id: int,
    category: Optional[ActivityCategory] = None,
    status: Optional[GoalStatus] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get all treatment goals for a specific client.
    
    - **category**: Filter by therapy category
    - **status**: Filter by goal status
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
    
    query = db.query(TreatmentGoal).filter(TreatmentGoal.client_id == client_id)
    
    if category:
        query = query.filter(TreatmentGoal.category == category)
    if status:
        query = query.filter(TreatmentGoal.status == status)
    
    return query.all()


@router.post("/{client_id}/goals", response_model=GoalResponse, status_code=status.HTTP_201_CREATED)
def create_goal(
    client_id: int,
    goal_data: GoalCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Create a new treatment goal for a client.
    
    - **category**: Therapy category (articulation, language, fluency, etc.)
    - **description**: Goal description
    - **target_accuracy**: Target accuracy percentage (default 80%)
    - **target_date**: Optional target completion date
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
    
    new_goal = TreatmentGoal(
        client_id=client_id,
        category=goal_data.category,
        description=goal_data.description,
        target_accuracy=goal_data.target_accuracy,
        target_date=goal_data.target_date
    )
    
    db.add(new_goal)
    db.commit()
    db.refresh(new_goal)
    
    return new_goal


@router.put("/{client_id}/goals/{goal_id}", response_model=GoalResponse)
def update_goal(
    client_id: int,
    goal_id: int,
    goal_data: GoalUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Update a treatment goal's information or progress.
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
    
    goal = db.query(TreatmentGoal).filter(
        TreatmentGoal.id == goal_id,
        TreatmentGoal.client_id == client_id
    ).first()
    
    if not goal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Goal not found"
        )
    
    update_data = goal_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(goal, field, value)
    
    db.commit()
    db.refresh(goal)
    
    return goal


@router.delete("/{client_id}/goals/{goal_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_goal(
    client_id: int,
    goal_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Delete a treatment goal.
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
    
    goal = db.query(TreatmentGoal).filter(
        TreatmentGoal.id == goal_id,
        TreatmentGoal.client_id == client_id
    ).first()
    
    if not goal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Goal not found"
        )
    
    db.delete(goal)
    db.commit()
