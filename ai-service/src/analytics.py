from fastapi import HTTPException, Depends
from sqlalchemy.orm import Session
import requests
import pandas as pd
import geoip2.database
import os
from datetime import datetime
from typing import List, Dict, Any, Optional

from .database import get_db, get_raw_visits, get_basic_stats, get_top_referrers
from .models import EnrichedVisit, GeoInfo, AICreateRequest, AICreateResponse, GraphInsightRequest, GraphInsightResponse, ChatRequest, ChatResponse

# Config
GEOIP_DB_PATH = os.getenv("GEOIP_DB_PATH", "./GeoLite2-City.mmdb") # Path to GeoLite2 City DB
OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions"
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
MISTRAL_MODEL = "mistralai/devstral-2512:free"

if not OPENROUTER_API_KEY:
    raise ValueError("OPENROUTER_API_KEY not set in .env file")

# GeoIP2 Reader (initialize once)
try:
    geoip_reader = geoip2.database.Reader(GEOIP_DB_PATH)
except FileNotFoundError:
    print(f"Warning: GeoLite2 City database not found at {GEOIP_DB_PATH}. Geolocation will be disabled.")
    geoip_reader = None
except Exception as e:
    print(f"Warning: Error loading GeoIP database: {e}. Geolocation will be disabled.")
    geoip_reader = None

# Helper functions

def parse_user_agent(user_agent_string: Optional[str]) -> Dict[str, Optional[str]]:
    if not user_agent_string:
        return {"device_type": None, "os": None, "browser": None}

    ua = user_agent_string.lower()
    device_type = "Desktop"
    os_info = "Unknown OS"
    browser_info = "Unknown Browser"

    if "mobile" in ua or "android" in ua or "iphone" in ua or "ipad" in ua:
        device_type = "Mobile/Tablet"
    if "windows" in ua:
        os_info = "Windows"
    elif "macintosh" in ua or "mac os x" in ua:
        os_info = "macOS"
    elif "android" in ua:
        os_info = "Android"
    elif "iphone" in ua or "ipad" in ua or "ios" in ua:
        os_info = "iOS"
    elif "linux" in ua:
        os_info = "Linux"

    if "chrome" in ua and "chromium" not in ua and "edg" not in ua: # Simple Chrome check
        browser_info = "Chrome"
    elif "firefox" in ua:
        browser_info = "Firefox"
    elif "safari" in ua and "chrome" not in ua: # Safari check, careful of Chrome on iOS
        browser_info = "Safari"
    elif "edg" in ua:
        browser_info = "Edge"
    elif "opera" in ua or "opr" in ua:
        browser_info = "Opera"
    elif "bot" in ua or "crawler" in ua or "spider" in ua:
        browser_info = "Bot/Crawler" # Special case

    return {"device_type": device_type, "os": os_info, "browser": browser_info}

def get_geolocation(ip_address_hash: Optional[str]) -> Optional[GeoInfo]:
    if not geoip_reader or not ip_address_hash:
        return None
    
    # TODO
    
    return None

def enrich_visit_data(raw_visits: List[Any]) -> List[EnrichedVisit]:
    enriched_data = []
    for visit in raw_visits:
        ua_parsed = parse_user_agent(visit.user_agent)
        
        # REVISIT: GeoIP lookup cannot be done with a hash.
        # If you MUST geolocate, you cannot hash the IP.
        # For now, we return None for geolocation.
        geo_info = get_geolocation(visit.visitor_ip_hash) 

        enriched_visit = EnrichedVisit(
            id=visit.id,
            url_id=visit.url_id,
            clicked_at=visit.clicked_at,
            device_type=ua_parsed["device_type"],
            os=ua_parsed["os"],
            browser=ua_parsed["browser"],
            geolocation=geo_info # This will be None based on current logic
        )
        enriched_data.append(enriched_visit)
    return enriched_data

def generate_ai_insight(url_id: int, db: Session) -> str:
    raw_visits_list = get_raw_visits(db, url_id, limit=500) # Limit raw data for performance
    if not raw_visits_list:
        return "No visit data available to generate insights."

    enriched_visits = enrich_visit_data(raw_visits_list)
    
    df = pd.DataFrame([visit.model_dump() for visit in enriched_visits])

    total_clicks_from_db, clicks_over_time_db = get_basic_stats(db, url_id)
    top_referrers_db = get_top_referrers(db, url_id)
    
    summary_parts = []
    summary_parts.append(f"Total clicks: {total_clicks_from_db}")
    
    if clicks_over_time_db:
        summary_parts.append(f"Clicks peaked between {clicks_over_time_db[0]['timestamp'].strftime('%H:%M')} and {clicks_over_time_db[-1]['timestamp'].strftime('%H:%M')} on average per hour.")
        hourly_df = pd.DataFrame(clicks_over_time_db)
        if not hourly_df.empty:
            hourly_df['timestamp'] = pd.to_datetime(hourly_df['timestamp'])
            hourly_df['day'] = hourly_df['timestamp'].dt.date
            daily_clicks = hourly_df.groupby('day')['count'].sum()
            if not daily_clicks.empty:
                most_active_day = daily_clicks.idxmax()
                summary_parts.append(f"The most active day appears to be: {most_active_day}")
            else:
                summary_parts.append("No specific day pattern detected.")
        else:
            summary_parts.append("No specific day pattern detected.")

    if top_referrers_db:
        top_3_referrers = ", ".join([f"{r['referer']} ({r['count']} clicks)" for r in top_referrers_db[:3]])
        summary_parts.append(f"Top referrers include: {top_3_referrers}")
    else:
        summary_parts.append("No referrers detected.")

    if df['device_type'].nunique() > 1:
        device_counts = df['device_type'].value_counts().to_dict()
        summary_parts.append(f"Device usage breakdown: {device_counts}")
    elif not df.empty:
        summary_parts.append(f"Majority device type: {df['device_type'].iloc[0]}")

    if df['os'].nunique() > 1:
        os_counts = df['os'].value_counts().to_dict()
        summary_parts.append(f"Operating System breakdown: {os_counts}")
    elif not df.empty:
        summary_parts.append(f"Majority OS: {df['os'].iloc[0]}")
        
    if df['browser'].nunique() > 1:
        browser_counts = df['browser'].value_counts().to_dict()
        summary_parts.append(f"Browser breakdown: {browser_counts}")
    elif not df.empty:
        summary_parts.append(f"Majority browser: {df['browser'].iloc[0]}")

    summary_parts.append("Due to privacy measures (IP hashing), precise geolocation data cannot be provided in this analysis.")

    data_summary = ". ".join(summary_parts)

    prompt = f"""
    Analyze the following traffic data for a shortened URL and provide a concise, actionable insight. Focus on patterns, trends, and potential implications.

    **Data Summary:**
    {data_summary}

    **Task:**
    Generate a short, natural language insight (1-3 sentences). For example: "Traffic spiked on Tuesday morning, primarily from mobile users in France using Chrome, suggesting a successful mobile campaign targeting that demographic." or "Unusual activity detected with a high volume of requests from bots between 2-4 AM."
    """

    # 4. Call OpenAI API (OpenRouter)
    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json"
    }
    payload = {
        "model": MISTRAL_MODEL,
        "messages": [{"role": "user", "content": prompt}]
    }

    try:
        response = requests.post(OPENROUTER_API_URL, headers=headers, json=payload)
        response.raise_for_status() # Raise HTTPError for bad responses (4xx or 5xx)
        
        api_response = response.json()
        if api_response and api_response.get("choices") and len(api_response["choices"]) > 0:
            # Ensure we get the actual message content
            content = api_response["choices"][0].get("message", {}).get("content")
            return content.strip() if content else "AI returned an empty response."
        else:
            return "AI returned an unexpected response format."

    except requests.exceptions.RequestException as e:
        return f"Error calling AI API: {e}"
    except Exception as e:
        return f"An unexpected error occurred during AI processing: {e}"

def _build_common_summary(url_id: int, db: Session) -> str:
  """
  Reuse your existing logic to build a textual summary for the URL.
  """
  raw_visits_list = get_raw_visits(db, url_id, limit=500)
  if not raw_visits_list:
      return "No visit data available."

  enriched_visits = enrich_visit_data(raw_visits_list)
  df = pd.DataFrame([visit.model_dump() for visit in enriched_visits])

  total_clicks_from_db, clicks_over_time_db = get_basic_stats(db, url_id)
  top_referrers_db = get_top_referrers(db, url_id)

  summary_parts = []
  summary_parts.append(f"Total clicks: {total_clicks_from_db}")

  if clicks_over_time_db:
      hourly_df = pd.DataFrame(clicks_over_time_db)
      hourly_df['timestamp'] = pd.to_datetime(hourly_df['timestamp'])
      hourly_df['day'] = hourly_df['timestamp'].dt.date
      daily_clicks = hourly_df.groupby('day')['count'].sum()
      if not daily_clicks.empty:
          most_active_day = daily_clicks.idxmax()
          summary_parts.append(f"Most active day: {most_active_day}")
  if top_referrers_db:
      top_3_referrers = ", ".join([f"{r['referer']} ({r['count']} clicks)" for r in top_referrers_db[:3]])
      summary_parts.append(f"Top referrers: {top_3_referrers}")

  if 'device_type' in df and not df.empty:
      device_counts = df['device_type'].value_counts().to_dict()
      summary_parts.append(f"Device breakdown: {device_counts}")
  if 'os' in df and not df.empty:
      os_counts = df['os'].value_counts().to_dict()
      summary_parts.append(f"OS breakdown: {os_counts}")
  if 'browser' in df and not df.empty:
      browser_counts = df['browser'].value_counts().to_dict()
      summary_parts.append(f"Browser breakdown: {browser_counts}")

  summary_parts.append("Geolocation is unavailable because IPs are hashed for privacy.")
  return ". ".join(summary_parts)

def _call_mistral(prompt: str) -> str:
  headers = {
      "Authorization": f"Bearer {OPENROUTER_API_KEY}",
      "Content-Type": "application/json",
  }
  payload = {
      "model": MISTRAL_MODEL,
      "messages": [{"role": "user", "content": prompt}],
  }
  try:
      resp = requests.post(OPENROUTER_API_URL, headers=headers, json=payload)
      resp.raise_for_status()
      data = resp.json()
      content = (
          data.get("choices", [{}])[0]
          .get("message", {})
          .get("content")
      )
      return content.strip() if content else "AI returned an empty response."
  except requests.RequestException as e:
      return f"Error calling AI API: {e}"
  except Exception as e:
      return f"Unexpected AI error: {e}"

def generate_graph_insight(url_id: int, graph_type: str, db: Session) -> str:
  summary = _build_common_summary(url_id, db)
  prompt = f"""
You are an analytics expert. A user is viewing the graph: {graph_type} for a specific shortened URL.

Overall data summary:
{summary}

Task:
1. Focus ONLY on insights relevant to the graph type "{graph_type}".
2. Describe the pattern, anomalies, and possible causes.
3. Suggest 1–2 concrete actions the user could take.

Respond in 3–5 concise sentences.
"""
  return _call_mistral(prompt)

def generate_ai_chat_response(url_id: int, message: str, context: str | None, db: Session) -> str:
  summary = _build_common_summary(url_id, db)
  prompt = f"""
You are an AI assistant helping a user understand analytics for a shortened URL.

Analytics summary:
{summary}

User context: {context or "general"}
User question: {message}

Answer clearly and concretely. Refer to the data patterns when possible. Keep it under 8 sentences.
"""
  return _call_mistral(prompt)

def get_full_analytics(url_id: int, db: Session) -> dict:
    """
    Returns complete analytics with device, browser, referrer, and hourly breakdowns.
    """

    raw_visits_list = get_raw_visits(db, url_id, limit=1000)
    if not raw_visits_list:
        return {
            "total_clicks": 0,
            "clicks_over_time": [],
            "device_breakdown": [],
            "browser_breakdown": [],
            "referrer_breakdown": [],
            "hourly_pattern": [],
        }
    
    enriched_visits = enrich_visit_data(raw_visits_list)
    df = pd.DataFrame([visit.model_dump() for visit in enriched_visits])
    

    total_clicks = len(df)
    
    df['clicked_at'] = pd.to_datetime(df['clicked_at'])
    df['date'] = df['clicked_at'].dt.date
    clicks_over_time = (
        df.groupby('date')
        .size()
        .reset_index(name='count')
    )
    clicks_over_time['date'] = clicks_over_time['date'].astype(str)
    clicks_over_time_list = clicks_over_time.to_dict('records')
    
    device_counts = df['device_type'].value_counts().reset_index()
    device_counts.columns = ['device', 'count']
    device_breakdown = device_counts.to_dict('records')
    
    browser_counts = df['browser'].value_counts().reset_index()
    browser_counts.columns = ['browser', 'count']
    browser_breakdown = browser_counts.to_dict('records')
    
    df['referrer_clean'] = df['referer'].fillna('Direct')
    referrer_counts = df['referrer_clean'].value_counts().reset_index()
    referrer_counts.columns = ['referrer', 'count']
    referrer_breakdown = referrer_counts.head(10).to_dict('records')
    
    df['hour'] = df['clicked_at'].dt.hour
    hourly_counts = df.groupby('hour').size().reset_index(name='count')
    hourly_pattern = hourly_counts.to_dict('records')
    
    return {
        "total_clicks": total_clicks,
        "clicks_over_time": clicks_over_time_list,
        "device_breakdown": device_breakdown,
        "browser_breakdown": browser_breakdown,
        "referrer_breakdown": referrer_breakdown,
        "hourly_pattern": hourly_pattern,
    }
