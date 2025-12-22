from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, Session
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise ValueError("DATABASE_URL not set in .env file")

engine = create_engine(DATABASE_URL)

# Session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Function to get a DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Function to fetch raw visits for a given URL ID
def get_raw_visits(db: Session, url_id: int, limit: int = 1000):
    # IMPORTANT: Use text() for raw SQL queries for security with SQLAlchemy
    # This assumes your 'visits' table has url_id, clicked_at, visitor_ip_hash, user_agent, referer
    query = text("""
        SELECT id, url_id, visitor_ip_hash, user_agent, referer, clicked_at
        FROM visits
        WHERE url_id = :url_id
        ORDER BY clicked_at DESC
        LIMIT :limit
    """)
    return db.execute(query, {"url_id": url_id, "limit": limit}).fetchall()

# Function to fetch basic stats for a URL
def get_basic_stats(db: Session, url_id: int):
    stats_query = text("""
        SELECT
            COUNT(*) as total_clicks,
            (SELECT COUNT(DISTINCT visitor_ip_hash) FROM visits WHERE url_id = :url_id) as unique_visitors,
            DATE_TRUNC('hour', clicked_at) as click_hour,
            COUNT(*) as hourly_clicks
        FROM visits
        WHERE url_id = :url_id
        GROUP BY DATE_TRUNC('hour', clicked_at)
        ORDER BY click_hour;
    """)
    basic_stats = db.execute(stats_query, {"url_id": url_id}).fetchall()

    # Process results into a more usable format for frontend
    total_clicks = 0
    clicks_over_time = []
    if basic_stats:
        total_clicks = sum([row.total_clicks for row in basic_stats if row.total_clicks is not None]) # Handle potential None if no data
        clicks_over_time = [{"timestamp": row.click_hour, "count": row.hourly_clicks} for row in basic_stats]
    
    return total_clicks, clicks_over_time

# Function to fetch top referrers
def get_top_referrers(db: Session, url_id: int, limit: int = 10):
    referer_query = text("""
        SELECT referer, COUNT(*) as count
        FROM visits
        WHERE url_id = :url_id AND referer IS NOT NULL AND referer != ''
        GROUP BY referer
        ORDER BY count DESC
        LIMIT :limit;
    """)
    referrers_data = db.execute(referer_query, {"url_id": url_id, "limit": limit}).fetchall()
    return [{"referer": row.referer, "count": row.count} for row in referrers_data]