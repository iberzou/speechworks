"""
Resource Library Router for SpeechWorks API
Handles therapy resources, worksheets, and materials management
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database import get_db
from app.models.models import User, Resource
from app.schemas.schemas import ResourceCreate, ResourceResponse, ActivityCategory
from app.services.auth_service import get_current_active_user
from app.services.s3_service import s3_service

router = APIRouter()


@router.get("/", response_model=List[ResourceResponse])
def get_resources(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    category: Optional[ActivityCategory] = None,
    resource_type: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get therapy resources from the library.
    
    - **category**: Filter by therapy category
    - **resource_type**: Filter by type (worksheet, flashcard, guide, video)
    - **search**: Search by title or description
    """
    query = db.query(Resource).filter(Resource.is_public == True)
    
    if category:
        query = query.filter(Resource.category == category)
    if resource_type:
        query = query.filter(Resource.resource_type == resource_type)
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            Resource.title.ilike(search_term) | Resource.description.ilike(search_term)
        )
    
    resources = query.order_by(Resource.download_count.desc()).offset(skip).limit(limit).all()
    return resources


@router.get("/types")
def get_resource_types(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get list of available resource types."""
    return [
        {"type": "worksheet", "display_name": "Worksheets", "icon": "📝"},
        {"type": "flashcard", "display_name": "Flashcards", "icon": "🃏"},
        {"type": "guide", "display_name": "Therapy Guides", "icon": "📖"},
        {"type": "video", "display_name": "Video Resources", "icon": "🎥"},
        {"type": "audio", "display_name": "Audio Samples", "icon": "🔊"},
        {"type": "game", "display_name": "Interactive Games", "icon": "🎮"}
    ]


@router.get("/my-uploads", response_model=List[ResourceResponse])
def get_my_resources(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get resources uploaded by the current user."""
    resources = db.query(Resource).filter(
        Resource.uploaded_by == current_user.id
    ).offset(skip).limit(limit).all()
    
    return resources


@router.post("/", response_model=ResourceResponse, status_code=status.HTTP_201_CREATED)
async def upload_resource(
    title: str,
    resource_type: str,
    file: UploadFile = File(...),
    description: Optional[str] = None,
    category: Optional[ActivityCategory] = None,
    is_public: bool = True,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Upload a new resource to the library.
    
    Supported file types: PDF, DOC, DOCX, images, audio files.
    Files are stored in AWS S3.
    
    - **title**: Resource title
    - **resource_type**: Type (worksheet, flashcard, guide, video, audio, game)
    - **file**: The file to upload
    - **description**: Resource description
    - **category**: Therapy category
    - **is_public**: Whether to share with other therapists
    """
    # Upload file to S3
    file_url = await s3_service.upload_file(file, folder="resources")
    
    # Create thumbnail for images
    thumbnail_url = None
    if file.content_type and file.content_type.startswith('image/'):
        thumbnail_url = file_url  # For now, use same URL
    
    new_resource = Resource(
        title=title,
        description=description,
        category=category,
        resource_type=resource_type,
        file_url=file_url,
        thumbnail_url=thumbnail_url,
        uploaded_by=current_user.id,
        is_public=is_public
    )
    
    db.add(new_resource)
    db.commit()
    db.refresh(new_resource)
    
    return new_resource


@router.get("/{resource_id}", response_model=ResourceResponse)
def get_resource(
    resource_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get a specific resource."""
    resource = db.query(Resource).filter(Resource.id == resource_id).first()
    
    if not resource:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resource not found"
        )
    
    # Check access
    if not resource.is_public and resource.uploaded_by != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this resource"
        )
    
    return resource


@router.get("/{resource_id}/download")
def download_resource(
    resource_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get download URL for a resource.
    
    Increments the download count.
    """
    resource = db.query(Resource).filter(Resource.id == resource_id).first()
    
    if not resource:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resource not found"
        )
    
    # Check access
    if not resource.is_public and resource.uploaded_by != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this resource"
        )
    
    # Increment download count
    resource.download_count += 1
    db.commit()
    
    return {
        "download_url": resource.file_url,
        "title": resource.title,
        "resource_type": resource.resource_type
    }


@router.put("/{resource_id}", response_model=ResourceResponse)
def update_resource(
    resource_id: int,
    title: Optional[str] = None,
    description: Optional[str] = None,
    category: Optional[ActivityCategory] = None,
    is_public: Optional[bool] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update a resource's metadata."""
    resource = db.query(Resource).filter(Resource.id == resource_id).first()
    
    if not resource:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resource not found"
        )
    
    # Only uploader can edit
    if resource.uploaded_by != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to edit this resource"
        )
    
    if title is not None:
        resource.title = title
    if description is not None:
        resource.description = description
    if category is not None:
        resource.category = category
    if is_public is not None:
        resource.is_public = is_public
    
    db.commit()
    db.refresh(resource)
    
    return resource


@router.delete("/{resource_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_resource(
    resource_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Delete a resource."""
    resource = db.query(Resource).filter(Resource.id == resource_id).first()
    
    if not resource:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resource not found"
        )
    
    # Only uploader can delete
    if resource.uploaded_by != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete this resource"
        )
    
    # Delete from S3
    if resource.file_url:
        try:
            s3_service.delete_file(resource.file_url)
        except:
            pass  # Continue even if S3 delete fails
    
    db.delete(resource)
    db.commit()
