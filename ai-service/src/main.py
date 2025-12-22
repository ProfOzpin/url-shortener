from fastapi import FastAPI, Depends, HTTPException, APIRouter
from sqlalchemy.orm import Session
from typing import List
import uvicorn
import os
import logging
from .database import get_db, get_basic_stats, get_top_referrers
from .analytics import generate_ai_insight
from .models import AICreateRequest, AICreateResponse, AnalyticsData
from dotenv import load_dotenv
logger = logging.getLogger(__name__)

# Load environment variables from .env file
load_dotenv()

app = FastAPI(title="URL Shortener AI Service")

# Endpoints

@app.get("/")
def read_root():
    return {"message": "AI Analytics Service is running."}

# Endpoint to generate AI insights for a specific URL
@app.post("/ai/insight", response_model=AICreateResponse)
def create_ai_insight(
    request_data: AICreateRequest,
    db: Session = Depends(get_db)
):
    insight = generate_ai_insight(request_data.url_id, db)
    return AICreateResponse(insight=insight)

# Endpoint to fetch basic analytics data
@app.get("/analytics/{url_id}", response_model=AnalyticsData)
def get_analytics_data(
    url_id: int,
    db: Session = Depends(get_db)
):
    try:
        total_clicks, clicks_over_time = get_basic_stats(db, url_id)
        top_referrers = get_top_referrers(db, url_id)
        
        return AnalyticsData(
            total_clicks=total_clicks,
            clicks_over_time=clicks_over_time,
            top_referrers=top_referrers
        )
    except Exception as e:
        # Log the error appropriately in a real application
        logger.error(f"Analytics error for url_id {url_id}", exc_info=False)
        raise HTTPException(status_code=500, detail="Failed to retrieve analytics data")