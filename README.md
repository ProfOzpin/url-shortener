    
# AI-Powered URL Shortener

A hybrid microservices application that provides URL shortening, high-performance redirection, and AI-driven traffic insights.

## Project Structure

```text
url_shortener/
├── docker-compose.yml      # Orchestrates the PostgreSQL Database
├── server/                 # Node.js + Express (Core Backend)
│   ├── .env
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── db.ts           # Database connection & schema init
│       └── index.ts        # Auth, URL CRUD, Redirection logic
├── ai-service/             # Python + FastAPI (AI & Analytics)
│   ├── .env
│   ├── requirements.txt
│   └── src/
│       ├── main.py         # FastAPI entry point
│       ├── analytics.py    # Logic for aggregating data & calling LLM
│       ├── database.py     # SQLAlchemy setup
│       └── models.py       # Pydantic & SQLAlchemy models
└── client/                 # React + Vite (Frontend)
    ├── index.html
    └── src/
        ├── api.ts          # Axios setup with JWT interceptors
        ├── index.css       # Global design system
        ├── App.tsx         # Routing logic
        └── pages/
            ├── Auth.tsx
            └── Dashboard.tsx

```  

## Architecture

This project uses a hybrid architecture to leverage the best tools for specific tasks:

    Frontend (React + Vite): A clean, minimalist dashboard for managing links and viewing insights.

    Core Backend (Node.js + Express): Handles high-concurrency tasks: Authentication, URL creation, and fast HTTP redirects.

    Analytics Service (Python + FastAPI): Handles data-intensive tasks: Processing logs, running analytics queries, and interfacing with the LLM (Mistral via OpenRouter).

    Database (PostgreSQL): A shared persistence layer running in Docker.

Tech Stack

    Frontend: React, TypeScript, Vite, CSS Modules.

    Core API: Node.js, Express, pg (Postgres driver), JWT Auth.

    AI Service: Python 3.10+, FastAPI, SQLAlchemy, Pandas.

    Database: PostgreSQL 15 (Dockerized).

    AI Model: Mistral (via OpenRouter API).

Setup Instructions
Prerequisites

    Node.js (v18+)

    Python (v3.10+)

    Docker & Docker Compose

1. Start the Database

From the root directory:
```code Bash
docker-compose up -d
```
  

2. Configure Environment Variables

Ensure you have the following .env files created:

server/.env (Node.js)
```code Env  
PORT=3000
DATABASE_URL=postgres://YOUR_DB_USER:YOUR_STRONG_PASSWORD@host:5432/dbname
JWT_SECRET={KEY}
```
  

ai-service/.env (Python)
```code Env   
# Note: SQLAlchemy requires 'postgresql://', Node uses 'postgres://'
DATABASE_URL=postgres://YOUR_DB_USER:YOUR_STRONG_PASSWORD@host:5432/dbname
OPENROUTER_API_KEY=sk-or-v1-YOUR-KEY-HERE
```

3. Run the Core Backend (Node.js)
```code Bash 
cd server
npm install
npm run dev
```
  
Runs on: http://localhost:3000

4. Run the AI Service (Python)
```code Bash 
cd ai-service
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn src.main:app --reload --port 8001
```
  
Runs on: http://localhost:8001

5. Run the Frontend (React)
```code Bash    
cd client
npm install
npm run dev
```
  

Runs on: http://localhost:5173
Usage Flow

    Open the Frontend (http://localhost:5173).

    Sign Up for an account.

    Create a Short URL (e.g., shorten https://google.com).

    Generate Traffic:

        Click the "Visit Link" button.

        Open the short link on your phone (connected to the same Wi-Fi) to simulate mobile traffic.

        Open the link in Incognito mode.

    Analyze: Click the "Analyze" button on the dashboard card.

    The Node.js server verifies your ownership and proxies the request to the Python service, which aggregates the data and uses Mistral AI to generate a text insight.

Security Measures
1. "React2Shell" & RCE Prevention

    Input Validation: The Python service uses Pydantic to strictly validate all incoming payloads.

    No Shell Execution: The application never uses os.system, subprocess.call(shell=True), or eval() on user inputs.

    Isolation: The AI service is internal. The Frontend cannot call it directly; requests must pass through the Node.js authentication layer first.

2. SQL Injection & XSS

    Node.js: Uses parameterized queries ($1, $2) via the pg library.

    Python: Uses SQLAlchemy ORM to abstract SQL execution.

    XSS: The API returns strictly application/json. No server-side HTML rendering occurs. React automatically escapes content in the View layer.

3. Privacy

    IP Anonymization: IP addresses are hashed using SHA-256 before being stored in the database to ensure user privacy (GDPR compliance approach).

Approach & Trade-offs
Architecture: Hybrid Node + Python

    Decision: Split the redirection engine from the analytics engine.

    Reason: Node.js is event-driven and non-blocking, making it superior for handling high-throughput redirects. Python is the industry standard for Data Science and LLM integration.

    Trade-off: Increases operational complexity (running two servers) in exchange for optimal performance in both domains.

Data Collection: Async Logging

    Decision: The Node.js redirect endpoint performs a "fire-and-forget" INSERT into the visits table.

    Reason: We strictly prioritized the User Experience. The user should not wait for the DB write or Analytics processing to be redirected.

    Trade-off: In a catastrophic server crash, a fraction of a second of analytics data might be lost, but the user redirection speed is preserved.

Analytics: IP Hashing vs. Geolocation

    Decision: We hash IPs immediately.

    Trade-off: We respect privacy (NFR requirement), but this prevents accurate server-side Geolocation (which requires raw IPs). The AI insight focuses on Headers (Device, OS, Browser) and Time patterns instead.

AI Integration

    Decision: Use a proxy route in Node.js to call Python.

    Reason: Keeps the Python service private and allows the Node.js service to handle Rate Limiting and Authorization centrally.
