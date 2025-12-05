"""
Database Configuration and Session Management
Supports AWS RDS MySQL
"""

from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.config import settings

# Create SQLAlchemy engine
# For AWS RDS, use connection pooling settings
engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,  # Enable connection health checks
    pool_recycle=3600,   # Recycle connections after 1 hour
    pool_size=5,         # Number of connections in the pool
    max_overflow=10,     # Additional connections when pool is full
    echo=settings.DEBUG  # Log SQL queries in debug mode
)

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for models
Base = declarative_base()

def get_db():
    """
    Database session dependency.
    Creates a new session for each request and closes it after.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
