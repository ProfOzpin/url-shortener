# 🔗 AI-Powered URL Shortener

A full-stack URL shortener with advanced analytics and AI-powered insights. Built with React, Node.js, FastAPI, and PostgreSQL.

## Key Considerations

### Development Approach

This project follows a microservices architecture with clear separation of concerns across three independent services. The decision to split functionality into dedicated services enables independent scaling, technology flexibility, and easier maintenance. Each service communicates via RESTful APIs, with the backend acting as the orchestration layer between the frontend and AI service.

### Key Design Decisions

1. Privacy-First Analytics
- IP addresses are hashed before storage using bcrypt, making them irreversible while still allowing unique visitor counting
- Trade-off: Cannot provide precise geolocation data, but maintains user privacy and GDPR compliance
- User agent parsing happens server-side to extract device/browser information without exposing raw data

2. AI Integration Strategy
- Leverages OpenRouter API with Mistral AI (free tier) rather than building custom ML models
- Trade-off: Depends on external API availability and rate limits, but significantly reduces complexity and infrastructure costs
- Provides three AI features: general insights, graph-specific analysis, and interactive chat
- Cost-effective for MVP and small to medium traffic

3. Technology Stack Choices

| Technology | Rationale | Trade-offs |
|------------|-----------|------------|
| **React + TypeScript** | Type safety, component reusability, excellent ecosystem | Steeper learning curve vs vanilla JS |
| **Node.js + Express** | Fast I/O operations, JavaScript full-stack consistency | Single-threaded (mitigated by clustering in production) |
| **FastAPI** | High performance Python, automatic API docs, async support | Python dependency management complexity |
| **PostgreSQL** | ACID compliance, robust for analytics queries, JSON support | Vertical scaling limitations vs NoSQL |
| **Docker** | Consistent environments, easy deployment, service isolation | Additional layer of complexity for local dev |

4. Authentication & Security
- JWT-based stateless authentication for scalability
- Passwords hashed with bcrypt (10 rounds)
- CORS configured to only accept requests from known origins
- SQL injection prevention through parameterized queries
- Trade-off: No session revocation without additional infrastructure (Redis)

5. Analytics Architecture
- Dual database approach: Backend handles click tracking, AI service reads for analysis
- Pandas DataFrames for flexible data transformations and aggregations
- Hourly/daily patterns computed on-demand rather than pre-aggregated
- Trade-off: Slower for high-traffic URLs but simpler to implement and maintain

### Assumptions

1. Traffic Volume: Designed for small to medium traffic (up to 10,000 URLs, 1M clicks/month per URL)
2. AI Response Time: Users expect AI insights within 3-5 seconds (acceptable UX trade-off)
3. Data Retention: Analytics data stored indefinitely; production would need data lifecycle policies
4. Browser Support: Modern browsers with ES6+ support (Chrome 90+, Firefox 88+, Safari 14+)
5. Deployment: Single-server deployment via Docker Compose; production would need Kubernetes or similar orchestration
6. API Key Security: OpenRouter API key stored in environment variables; production would use secrets management (HashiCorp Vault, AWS Secrets Manager)

### Known Limitations & Future Improvements

Current Limitations:
- No geographic analytics due to IP hashing (privacy vs functionality trade-off)
- AI insights limited to 500 most recent visits for performance
- No real-time analytics updates (requires WebSocket implementation)
- Single database instance (no replication or sharding)
- No rate limiting on public endpoints

## ✨ Features

### Core Features
- ⚡ **Lightning-fast URL shortening** with custom short codes
- 🔐 **Secure authentication** using JWT tokens
- 📊 **Comprehensive analytics** tracking clicks, devices, browsers, and referrers
- 🤖 **AI-powered insights** using Mistral AI via OpenRouter
- 💬 **Interactive AI chatbot** for analytics queries
- 📈 **Real-time charts** with Recharts visualization
- 🔒 **Privacy-focused** with IP hashing

### Analytics Features
- Click tracking over time
- Device breakdown (Desktop/Mobile)
- Browser and OS detection
- Referrer source tracking
- Hourly traffic patterns
- AI-generated insights for each graph

## 🛠️ Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for blazing-fast builds
- **Recharts** for data visualization
- **Axios** for API calls
- **React Router** for navigation

### Backend
- **Node.js 20** with Express
- **TypeScript** for type safety
- **PostgreSQL** with node-postgres
- **JWT** for authentication
- **bcrypt** for password hashing

### AI Service
- **Python 3.11** with FastAPI
- **Pandas** for data analysis
- **SQLAlchemy** for database ORM
- **OpenRouter API** (Mistral AI)
- **User-agent parsing** for device detection

### DevOps
- **Docker** & **Docker Compose**
- **Nginx** for frontend serving
- **Multi-stage builds** for optimization
- **pytest** for Python testing

## 📦 Prerequisites

- **Docker** 20.10+ and **Docker Compose** 1.29+
- **Git** for cloning the repository
- **4GB RAM** minimum
- Ports **80**, **3000**, **5432**, **8001** available

For local development without Docker:
- **Node.js 20+**
- **Python 3.11+**
- **PostgreSQL 16+**

## 🚀 Quick Start with Docker

### 1. Clone the Repository

```text
git clone https://github.com/yourusername/url-shortener.git
cd url-shortener
```

### 2. Set Up Environment Variables

Copy the example environment file

```text
cp .env.example .env
```
Edit with your preferred editor

**Required environment variables:**

Database
```
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_secure_password_here
POSTGRES_DB=urlshortener
```

JWT Secret (generate with: openssl rand -hex 32)
```
JWT_SECRET=your_jwt_secret_at_least_32_characters_long
```
AI Service (get free key from https://openrouter.ai/)
```
OPENROUTER_API_KEY=your_openrouter_api_key
```
Frontend
```
VITE_API_URL=http://localhost:3000
FRONTEND_URL=http://localhost
```

### 3. Build and Run

Build all services (first time only, takes 5-10 minutes)
```
docker-compose build
Start all services in detached mode

docker-compose up -d

docker-compose logs -f
```

### 4. Access the Application

- **Frontend**: http://localhost
- **Backend API**: http://localhost:3000
- **AI Service Docs**: http://localhost:8001/docs
- **Database**: localhost:5432

### 5. Stop the Application

Stop all services
```
docker-compose down
Stop and remove volumes (clean slate)

docker-compose down -v
```

## 💻 Local Development Setup

### Backend (Node.js)
```
cd server
# Install dependencies

npm install
# Set up environment

cp .env.example .env
# Edit .env with your database credentials
# Run database migrations (if applicable)
npm run migrate
# Start development server

npm run dev
# Server runs on [**http://localhost:3000**](http://localhost:3000)
```

### AI Service (Python)
```
cd ai-service
# Create virtual environment

python -m venv .venv
source .venv/bin/activate # On Windows: .venv\Scripts\activate
# Install dependencies

pip install -r requirements.txt
# Set up environment

cp .env.example .env
# Add your OPENROUTER_API_KEY
# Start development server

uvicorn src.main:app --reload --port 8001
```

AI service runs on [**http://localhost:8001**](http://localhost:8001)

### Frontend (React)
```
cd client
# Install dependencies

npm install
# Set up environment

cp .env.example .env
# Edit VITE_API_URL if needed
# Start development server

npm run dev
```

Frontend runs on [**http://localhost:5173**](http://localhost:5173)

## 🧪 Testing

### Backend Tests
```
cd server
npm test
# With coverage

npm run test:coverage
```

### AI Service Tests
```
cd ai-service
source .venv/bin/activate
# Run tests

pytest
# With coverage

pytest --cov=src --cov-report=term-missing
# Generate HTML coverage report

pytest --cov=src --cov-report=html
```

## 📁 Project Structure
```
url-shortener/
├── client/ # React frontend
│ ├── src/
│ │ ├── pages/ # Page components
│ │ │ ├── Dashboard.tsx
│ │ │ ├── Analytics.tsx
│ │ │ ├── Auth.tsx
│ │ │ └── AIChatbox.tsx
│ │ ├── App.tsx
│ │ └── main.tsx
│ ├── Dockerfile # Multi-stage build with Nginx
│ ├── nginx.conf # Nginx configuration
│ └── package.json
│
├── server/ # Node.js backend
│ ├── src/
│ │ ├── index.ts # Express server setup
│ │ └── db.ts # Database connection
│ ├── Dockerfile
│ ├── tsconfig.json
│ └── package.json
│
├── ai-service/ # FastAPI AI service
│ ├── src/
│ │ ├── main.py # FastAPI routes
│ │ ├── analytics.py # AI logic & data processing
│ │ ├── models.py # Pydantic models
│ │ └── database.py # SQLAlchemy setup
│ ├── tests/
│ │ ├── test_analytics.py
│ │ ├── test_api.py
│ │ └── conftest.py
│ ├── Dockerfile
│ ├── requirements.txt
│ └── pytest.ini
│
├── docker-compose.yml # Orchestrates all services
├── .env # Environment variables (gitignored)
├── .env.example # Example environment file
└── README.md
```

## 📡 API Documentation

### Backend API Endpoints

#### Authentication
```
POST /api/auth/register - Register new user
POST /api/auth/login - Login user
GET /api/auth/me - Get current user
```

#### URLs
```
POST /api/urls - Create shortened URL
GET /api/urls - Get user's URLs
GET /api/urls/:id - Get specific URL
DELETE /api/urls/:id - Delete URL
GET /:shortCode - Redirect to original URL
```

### AI Service API Endpoints

#### Analytics
```
GET /analytics/{url_id} - Get complete analytics data
POST /ai/insight - Generate AI insight
POST /ai/graph-insight - Get graph-specific insight
POST /ai/chat - Chat with AI about analytics
```

Full API documentation available at:
- **Swagger UI**: http://localhost:8001/docs
- **ReDoc**: http://localhost:8001/redoc

## 🔧 Environment Variables

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `POSTGRES_USER` | PostgreSQL username | `postgres` |
| `POSTGRES_PASSWORD` | PostgreSQL password | `secure_password_123` |
| `POSTGRES_DB` | Database name | `urlshortener` |
| `JWT_SECRET` | JWT signing key (32+ chars) | Generated with `openssl rand -hex 32` |
| `OPENROUTER_API_KEY` | OpenRouter API key | `sk-or-v1-...` |
| `VITE_API_URL` | Backend API URL | `http://localhost:3000` |
| `FRONTEND_URL` | Frontend URL for CORS | `http://localhost` |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Backend server port | `3000` |
| `NODE_ENV` | Node environment | `development` |
| `GEOIP_DB_PATH` | Path to GeoLite2 database | `./GeoLite2-City.mmdb` |

## 🐛 Troubleshooting

### Port Already in Use
```
# Check what's using the port

sudo lsof -i :80
sudo lsof -i :3000
sudo lsof -i :8001
# Kill the process or change ports in docker-compose.yml
```

### Database Connection Issues
```
# Check if PostgreSQL container is running

docker-compose ps
# View database logs

docker-compose logs postgres
# Reset database

docker-compose down -v
docker-compose up -d
```

### Docker Build Errors
```
# Clean rebuild without cache

docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### AI Service Errors
```
# Check AI service logs

docker-compose logs ai-service
# Verify OPENROUTER_API_KEY is set correctly

docker-compose exec ai-service env | grep OPENROUTER
```

### Frontend Not Loading
```
# Check if client container is running

docker ps | grep urlshortener-client
# View nginx logs

docker-compose logs client
# Rebuild client

docker-compose build client
docker-compose up -d client
``` 