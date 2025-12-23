from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class AnalyticsData(BaseModel):
    total_clicks: int
    clicks_over_time: List[dict]
    top_referrers: List[dict]

class AICreateRequest(BaseModel):
    url_id: int

class AICreateResponse(BaseModel):
    insight: str
    generated_at: datetime = Field(default_factory=datetime.utcnow)

class GeoInfo(BaseModel):
    country: Optional[str] = None
    region: Optional[str] = None
    city: Optional[str] = None

class EnrichedVisit(BaseModel):
    id: int
    url_id: int
    clicked_at: datetime
    device_type: Optional[str] = None
    os: Optional[str] = None
    browser: Optional[str] = None
    referer: Optional[str] = None
    geolocation: Optional[GeoInfo] = None

class GraphInsightRequest(BaseModel):
    url_id: int
    graph_type: str

class GraphInsightResponse(BaseModel):
    insight: str
    generated_at: datetime = Field(default_factory=datetime.utcnow)

class ChatRequest(BaseModel):
    url_id: int
    message: str
    context: Optional[str] = None

class ChatResponse(BaseModel):
    response: str
    generated_at: datetime = Field(default_factory=datetime.utcnow)

class ClickOverTime(BaseModel):
    date: str  # or timestamp
    count: int

class DeviceBreakdown(BaseModel):
    device: str
    count: int

class BrowserBreakdown(BaseModel):
    browser: str
    count: int

class ReferrerBreakdown(BaseModel):
    referrer: str
    count: int

class HourlyPattern(BaseModel):
    hour: int
    count: int

class AnalyticsData(BaseModel):
    total_clicks: int
    clicks_over_time: List[ClickOverTime]
    device_breakdown: List[DeviceBreakdown]
    browser_breakdown: List[BrowserBreakdown]
    referrer_breakdown: List[ReferrerBreakdown]
    hourly_pattern: List[HourlyPattern]