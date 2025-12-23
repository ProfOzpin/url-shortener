from fastapi import FastAPI, Depends, HTTPException, APIRouter
from sqlalchemy.orm import Session
from typing import List
import uvicorn
import os
import logging
from .database import get_db, get_basic_stats, get_top_referrers
from .analytics import generate_ai_insight
from .models import AICreateRequest, AICreateResponse, AnalyticsData, GraphInsightRequest, GraphInsightResponse, ChatRequest, ChatResponse
from .analytics import generate_ai_insight, generate_graph_insight, generate_ai_chat_response, get_full_analytics

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
        analytics_dict = get_full_analytics(url_id, db)
        return AnalyticsData(**analytics_dict)
    except Exception as e:
        logger.error(f"Analytics error for url_id {url_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to retrieve analytics data")

    
@app.post("/ai/graph-insight", response_model=GraphInsightResponse)
def graph_insight(
    request_data: GraphInsightRequest,
    db: Session = Depends(get_db),
):
    insight = generate_graph_insight(request_data.url_id, request_data.graph_type, db)
    return GraphInsightResponse(insight=insight)

@app.post("/ai/chat", response_model=ChatResponse)
def ai_chat(
    request_data: ChatRequest,
    db: Session = Depends(get_db),
):
    response = generate_ai_chat_response(
        request_data.url_id,
        request_data.message,
        request_data.context,
        db,
    )
    return ChatResponse(response=response)