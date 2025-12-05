 SpeechWorks - Speech Therapy Treatment Tool

A comprehensive web-based speech therapy treatment tool designed for speech-language pathologists (SLPs) to manage clients, conduct therapy sessions, track progress, and deliver interactive treatment activities.

 🎯 Project Overview

SpeechWorks is a full-stack web application that serves as a treatment tool during speech therapy sessions. It enables therapists to:

- Manage client profiles and treatment goals
- Schedule and conduct therapy sessions with SOAP documentation
- Deliver interactive articulation, language, fluency, and voice therapy activities
- Track client progress with visual charts and analytics
- Access and share therapy resources (worksheets, flashcards, guides)

 Technology Stack

| Layer | Technology |
|-------|------------|
| Frontend | AngularJS 1.8, HTML5, CSS3, JavaScript |
| Backend | Python FastAPI |
| Database | MySQL / AWS RDS |
| Cloud Storage | AWS S3 |
| Authentication | JWT (JSON Web Tokens) |
| API Documentation | Swagger/OpenAPI |

 📋 Features

 Client Management
- Create and manage client profiles with diagnosis information
- Set and track treatment goals by therapy category
- View comprehensive client history and progress

 Therapy Sessions
- Schedule sessions with calendar integration
- Document sessions with SOAP notes (Subjective, Objective, Assessment, Plan)
- Track activities used in each session with accuracy data

 Interactive Activities
- Articulation: Target sound practice (S, R, L, TH sounds)
- Language: Naming, sentence building, following directions
- Fluency: Easy onset, stretching exercises
- Voice: Projection and breath support activities
- Phonology: Sound awareness and pattern activities

 Progress Tracking
- Real-time accuracy tracking during activities
- Visual progress charts over time
- Goal achievement monitoring
- Dashboard analytics

 Resource Library
- Upload and share therapy materials
- Categorized worksheets, flashcards, and guides
- AWS S3 integration for file storage

 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                             │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │  Web App    │  │ Mobile App  │  │ Desktop App │              │
│  │ (AngularJS) │  │  (Future)   │  │  (Future)   │              │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘              │
│         │                │                │                      │
│         └────────────────┼────────────────┘                      │
│                          │                                       │
│                    HTTP/HTTPS REST                               │
├──────────────────────────┼──────────────────────────────────────┤
│                          ▼                                       │
│                   ┌─────────────┐                                │
│                   │   FastAPI   │                                │
│                   │  REST API   │                                │
│                   └──────┬──────┘                                │
│                          │                                       │
│  ┌───────────────────────┼───────────────────────┐              │
│  │                       │                       │              │
│  ▼                       ▼                       ▼              │
│ ┌─────────┐        ┌─────────┐           ┌─────────┐            │
│ │ Auth    │        │ Business│           │   S3    │            │
│ │ Service │        │  Logic  │           │ Service │            │
│ └────┬────┘        └────┬────┘           └────┬────┘            │
│      │                  │                     │                  │
├──────┼──────────────────┼─────────────────────┼─────────────────┤
│      │                  │                     │                  │
│      ▼                  ▼                     ▼                  │
│ ┌─────────────────────────────┐        ┌─────────────┐          │
│ │        AWS RDS MySQL        │        │   AWS S3    │          │
│ │         (Database)          │        │  (Storage)  │          │
│ └─────────────────────────────┘        └─────────────┘          │
│                         AWS CLOUD LAYER                          │
└─────────────────────────────────────────────────────────────────┘
```

 📁 Project Structure

```
speechworks/
├── backend/
│   ├── app/
│   │   ├── main.py               FastAPI application entry point
│   │   ├── config.py             Configuration settings
│   │   ├── database.py           Database connection
│   │   ├── models/
│   │   │   └── models.py         SQLAlchemy models
│   │   ├── schemas/
│   │   │   └── schemas.py        Pydantic schemas
│   │   ├── routers/
│   │   │   ├── auth.py           Authentication endpoints
│   │   │   ├── clients.py        Client management
│   │   │   ├── sessions.py       Session management
│   │   │   ├── activities.py     Activity management
│   │   │   ├── progress.py       Progress tracking
│   │   │   └── resources.py      Resource library
│   │   └── services/
│   │       ├── auth_service.py   JWT authentication
│   │       └── s3_service.py     AWS S3 integration
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── index.html                Main HTML file
│   ├── css/
│   │   └── styles.css            Application styles
│   └── js/
│       ├── app.js                AngularJS module
│       └── controllers/
│           ├── MainController.js
│           ├── DashboardController.js
│           ├── ClientsController.js
│           ├── SessionsController.js
│           ├── ActivitiesController.js
│           └── ResourcesController.js
├── sql/
│   └── schema.sql                Database schema
├── docs/
│   
└── README.md
```

 🚀 Getting Started

 Prerequisites

- Python 3.9+
- Node.js 16+ (for frontend development server)
- MySQL 8.0+ or AWS RDS MySQL
- AWS Account (for S3 storage)

 Backend Setup

1. Clone the repository
   ```bash
   git clone https://github.com/yourusername/speechworks.git
   cd speechworks
   ```

2. Create virtual environment
   ```bash
   cd backend
   python -m venv venv OR python3.12 -m venv venv
   source venv/bin/activate   On Windows: venv\Scripts\activate
   ```

3. Install dependencies
   ```bash
   pip install -r requirements.txt
   ```

4. Configure environment variables
   ```bash
   cp .env.example .env
    Edit .env with your database and AWS credentials
   ```

5. Set up the database
   ```bash
   mysql -u root -p < ../sql/schema.sql
   ```

6. Run the API server
   ```bash
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

 Frontend Setup

1. Serve the frontend
   ```bash
   cd frontend
    Using Python's built-in server
   python -m http.server 5500
    Or use VS Code Live Server extension
   ```

2. Open in browser
   ```
   http://localhost:5500
   ```

 Demo Account
- Email: demo@speechworks.com
- Password: Demo1234!

 ☁️ AWS Deployment

 AWS RDS Setup (Free Tier)

1. Create RDS Instance
   - Engine: MySQL 8.0
   - Template: Free tier
   - Instance: db.t3.micro
   - Storage: 20 GB

2. Configure Security Group
   - Allow inbound MySQL (port 3306) from your application

3. Update Environment Variables
   ```env
   DB_HOST=speechworks-db.xxxxx.us-east-1.rds.amazonaws.com
   DB_PORT=3306
   DB_USER=admin
   DB_PASSWORD=your_password
   DB_NAME=speechworks_db
   ```

 AWS S3 Setup

1. Create S3 Bucket
   - Bucket name: speechworks-resources
   - Region: us-east-1

2. Configure CORS
   ```json
   [
       {
           "AllowedHeaders": [""],
           "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
           "AllowedOrigins": [""],
           "ExposeHeaders": []
       }
   ]
   ```

3. Create IAM User
   - Policy: AmazonS3FullAccess (or custom policy)
   - Save Access Key and Secret Key

 API Deployment Options

1. AWS EC2
   - Launch t2.micro instance
   - Install Python and dependencies
   - Use Nginx as reverse proxy
   - Configure systemd service

2. AWS Elastic Beanstalk
   - Create Python environment
   - Deploy via EB CLI

3. AWS Lambda + API Gateway
   - Use Mangum adapter for FastAPI
   - Serverless deployment

 📚 API Documentation

Once the server is running, access:
- Swagger UI: http://localhost:8000/api/docs
- ReDoc: http://localhost:8000/api/redoc

 Main Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | Register new user |
| POST | /api/auth/login | Login and get token |
| GET | /api/clients | List all clients |
| POST | /api/clients | Create new client |
| GET | /api/sessions | List therapy sessions |
| POST | /api/sessions | Schedule new session |
| GET | /api/activities | List therapy activities |
| GET | /api/progress/dashboard | Dashboard statistics |
| POST | /api/progress | Record progress data |

 🎨 Screenshots

 Dashboard
![Dashboard](docs/screenshots/dashboard.png)

 Client Management
![Clients](docs/screenshots/clients.png)

 Interactive Activity
![Activity](docs/screenshots/activity.png)

 Session SOAP Notes
![Session](docs/screenshots/session.png)

 📖 Technical Documentation

Full technical documentation including:
- System flowcharts
- Database schema diagrams
- API specifications
- Deployment guides

See [docs/Technical_Documentation.docx](docs/Technical_Documentation.docx)

 🔐 Security Features

- JWT-based authentication
- Password hashing with bcrypt
- CORS configuration
- Input validation with Pydantic
- SQL injection prevention with SQLAlchemy ORM

 📄 License

This project is created for educational purposes as part of INEW 2434 Advanced Web Programming course at Houston Community College.

 👩‍💻 Author

Ilhem Berzou - Houston City College
- Course: INEW 2434 Advanced Web Programming
- Focus: Speech-Language Pathology

 🙏 Acknowledgments

- American Speech-Language-Hearing Association (ASHA) for therapy guidelines
- FastAPI documentation and community
- AngularJS team for the framework
- AWS for cloud services

---

SpeechWorks - Empowering speech therapy through technology 🗣️💬
