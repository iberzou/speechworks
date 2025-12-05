"""
Therapy Activities Router for SpeechWorks API
Handles therapy activity management and word lists
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database import get_db
from app.models.models import User, Activity, ActivityWord
from app.schemas.schemas import (
    ActivityCreate, ActivityUpdate, ActivityResponse, ActivityWithWords,
    ActivityWordCreate, ActivityWordResponse, ActivityCategory
)
from app.services.auth_service import get_current_active_user
from app.services.s3_service import s3_service

router = APIRouter()


@router.get("/", response_model=List[ActivityResponse])
def get_activities(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    category: Optional[ActivityCategory] = None,
    difficulty: Optional[int] = Query(None, ge=1, le=5),
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get all therapy activities.
    
    - **category**: Filter by therapy category
    - **difficulty**: Filter by difficulty level (1-5)
    - **search**: Search by name or description
    """
    query = db.query(Activity).filter(Activity.is_active == True)
    
    if category:
        query = query.filter(Activity.category == category)
    if difficulty:
        query = query.filter(Activity.difficulty_level == difficulty)
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            Activity.name.ilike(search_term) | Activity.description.ilike(search_term)
        )
    
    activities = query.offset(skip).limit(limit).all()
    return activities


@router.get("/categories", response_model=List[dict])
def get_activity_categories(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get list of activity categories with counts."""
    from sqlalchemy import func
    
    categories = db.query(
        Activity.category,
        func.count(Activity.id).label('count')
    ).filter(Activity.is_active == True).group_by(Activity.category).all()
    
    return [
        {
            "category": cat.category.value,
            "display_name": cat.category.value.replace('_', ' ').title(),
            "count": cat.count
        }
        for cat in categories
    ]


@router.post("/", response_model=ActivityResponse, status_code=status.HTTP_201_CREATED)
def create_activity(
    activity_data: ActivityCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Create a new therapy activity.
    
    - **name**: Activity name
    - **description**: Description of the activity
    - **category**: Therapy category
    - **instructions**: How to conduct the activity
    - **target_sounds**: Target phonemes (for articulation)
    - **difficulty_level**: Difficulty 1-5
    - **materials_needed**: Required materials
    """
    new_activity = Activity(**activity_data.model_dump())
    
    db.add(new_activity)
    db.commit()
    db.refresh(new_activity)
    
    return new_activity


@router.get("/{activity_id}", response_model=ActivityWithWords)
def get_activity(
    activity_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get a specific activity with its word list."""
    activity = db.query(Activity).filter(Activity.id == activity_id).first()
    
    if not activity:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Activity not found"
        )
    
    return activity


@router.put("/{activity_id}", response_model=ActivityResponse)
def update_activity(
    activity_id: int,
    activity_data: ActivityUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update an activity's information."""
    activity = db.query(Activity).filter(Activity.id == activity_id).first()
    
    if not activity:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Activity not found"
        )
    
    update_data = activity_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(activity, field, value)
    
    db.commit()
    db.refresh(activity)
    
    return activity


@router.post("/{activity_id}/image")
async def upload_activity_image(
    activity_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Upload an image for an activity (stored in AWS S3)."""
    activity = db.query(Activity).filter(Activity.id == activity_id).first()
    
    if not activity:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Activity not found"
        )
    
    # Upload to S3
    image_url = await s3_service.upload_image(file)
    
    # Update activity
    activity.image_url = image_url
    db.commit()
    
    return {"message": "Image uploaded successfully", "image_url": image_url}


@router.post("/{activity_id}/audio")
async def upload_activity_audio(
    activity_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Upload an audio prompt for an activity (stored in AWS S3)."""
    activity = db.query(Activity).filter(Activity.id == activity_id).first()
    
    if not activity:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Activity not found"
        )
    
    # Upload to S3
    audio_url = await s3_service.upload_audio(file)
    
    # Update activity
    activity.audio_url = audio_url
    db.commit()
    
    return {"message": "Audio uploaded successfully", "audio_url": audio_url}


@router.delete("/{activity_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_activity(
    activity_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Soft delete an activity."""
    activity = db.query(Activity).filter(Activity.id == activity_id).first()
    
    if not activity:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Activity not found"
        )
    
    activity.is_active = False
    db.commit()


# ============== Activity Word List Endpoints ==============

@router.get("/{activity_id}/words", response_model=List[ActivityWordResponse])
def get_activity_words(
    activity_id: int,
    position: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get word list for an activity.
    
    - **position**: Filter by sound position (initial, medial, final)
    """
    activity = db.query(Activity).filter(Activity.id == activity_id).first()
    
    if not activity:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Activity not found"
        )
    
    query = db.query(ActivityWord).filter(ActivityWord.activity_id == activity_id)
    
    if position:
        query = query.filter(ActivityWord.position == position)
    
    return query.all()


@router.post("/{activity_id}/words", response_model=ActivityWordResponse, status_code=status.HTTP_201_CREATED)
def add_activity_word(
    activity_id: int,
    word_data: ActivityWordCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Add a word to an activity's word list.
    
    - **word**: The target word
    - **phonetic**: Phonetic transcription
    - **position**: Sound position (initial, medial, final)
    - **syllables**: Number of syllables
    """
    activity = db.query(Activity).filter(Activity.id == activity_id).first()
    
    if not activity:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Activity not found"
        )
    
    new_word = ActivityWord(
        activity_id=activity_id,
        word=word_data.word,
        phonetic=word_data.phonetic,
        position=word_data.position,
        syllables=word_data.syllables
    )
    
    db.add(new_word)
    db.commit()
    db.refresh(new_word)
    
    return new_word


@router.post("/{activity_id}/words/bulk", response_model=List[ActivityWordResponse])
def add_activity_words_bulk(
    activity_id: int,
    words: List[ActivityWordCreate],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Add multiple words to an activity at once."""
    activity = db.query(Activity).filter(Activity.id == activity_id).first()
    
    if not activity:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Activity not found"
        )
    
    new_words = []
    for word_data in words:
        new_word = ActivityWord(
            activity_id=activity_id,
            word=word_data.word,
            phonetic=word_data.phonetic,
            position=word_data.position,
            syllables=word_data.syllables
        )
        db.add(new_word)
        new_words.append(new_word)
    
    db.commit()
    
    for word in new_words:
        db.refresh(word)
    
    return new_words


@router.delete("/{activity_id}/words/{word_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_activity_word(
    activity_id: int,
    word_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Delete a word from an activity."""
    word = db.query(ActivityWord).filter(
        ActivityWord.id == word_id,
        ActivityWord.activity_id == activity_id
    ).first()
    
    if not word:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Word not found"
        )
    
    db.delete(word)
    db.commit()
