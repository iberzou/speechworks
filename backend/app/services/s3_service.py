"""
AWS S3 Service for File Storage
Handles file uploads for therapy resources, images, and audio
"""

import boto3
from botocore.exceptions import ClientError
from fastapi import UploadFile, HTTPException
from typing import Optional
import uuid
from datetime import datetime

from app.config import settings


class S3Service:
    """AWS S3 file storage service"""
    
    def __init__(self):
        """Initialize S3 client"""
        self.s3_client = boto3.client(
            's3',
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            region_name=settings.AWS_REGION
        )
        self.bucket_name = settings.S3_BUCKET_NAME
    
    def _generate_unique_filename(self, original_filename: str, folder: str) -> str:
        """Generate unique filename with timestamp and UUID"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        unique_id = str(uuid.uuid4())[:8]
        extension = original_filename.split('.')[-1] if '.' in original_filename else ''
        return f"{folder}/{timestamp}_{unique_id}.{extension}"
    
    async def upload_file(
        self,
        file: UploadFile,
        folder: str = "resources",
        content_type: Optional[str] = None
    ) -> str:
        """
        Upload file to S3 bucket
        
        Args:
            file: FastAPI UploadFile object
            folder: S3 folder/prefix (resources, images, audio)
            content_type: MIME type override
        
        Returns:
            Public URL of uploaded file
        """
        try:
            # Generate unique filename
            key = self._generate_unique_filename(file.filename, folder)
            
            # Determine content type
            file_content_type = content_type or file.content_type or 'application/octet-stream'
            
            # Read file content
            content = await file.read()
            
            # Upload to S3
            self.s3_client.put_object(
                Bucket=self.bucket_name,
                Key=key,
                Body=content,
                ContentType=file_content_type,
                ACL='public-read'  # Make publicly accessible
            )
            
            # Return public URL
            return f"https://{self.bucket_name}.s3.{settings.AWS_REGION}.amazonaws.com/{key}"
            
        except ClientError as e:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to upload file to S3: {str(e)}"
            )
    
    async def upload_image(self, file: UploadFile) -> str:
        """Upload image file to S3"""
        allowed_types = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
        if file.content_type not in allowed_types:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid image type. Allowed: {', '.join(allowed_types)}"
            )
        return await self.upload_file(file, folder="images")
    
    async def upload_audio(self, file: UploadFile) -> str:
        """Upload audio file to S3"""
        allowed_types = ['audio/mpeg', 'audio/wav', 'audio/mp3', 'audio/ogg']
        if file.content_type not in allowed_types:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid audio type. Allowed: {', '.join(allowed_types)}"
            )
        return await self.upload_file(file, folder="audio")
    
    async def upload_document(self, file: UploadFile) -> str:
        """Upload document file to S3"""
        allowed_types = [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ]
        if file.content_type not in allowed_types:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid document type. Allowed: PDF, DOC, DOCX"
            )
        return await self.upload_file(file, folder="documents")
    
    def delete_file(self, file_url: str) -> bool:
        """
        Delete file from S3 bucket
        
        Args:
            file_url: Full S3 URL of the file
        
        Returns:
            True if deleted successfully
        """
        try:
            # Extract key from URL
            key = file_url.split(f"{self.bucket_name}.s3.{settings.AWS_REGION}.amazonaws.com/")[-1]
            
            self.s3_client.delete_object(
                Bucket=self.bucket_name,
                Key=key
            )
            return True
            
        except ClientError as e:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to delete file from S3: {str(e)}"
            )
    
    def generate_presigned_url(self, key: str, expiration: int = 3600) -> str:
        """
        Generate presigned URL for private file access
        
        Args:
            key: S3 object key
            expiration: URL expiration in seconds (default 1 hour)
        
        Returns:
            Presigned URL
        """
        try:
            url = self.s3_client.generate_presigned_url(
                'get_object',
                Params={
                    'Bucket': self.bucket_name,
                    'Key': key
                },
                ExpiresIn=expiration
            )
            return url
        except ClientError as e:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to generate presigned URL: {str(e)}"
            )


# Singleton instance
s3_service = S3Service()
