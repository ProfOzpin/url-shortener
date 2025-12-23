import pytest
from unittest.mock import patch


def test_root_endpoint(client):
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "AI Analytics Service is running."}


def test_analytics_endpoint_success(client, test_db, mocker):
    # Mock get_full_analytics
    mock_analytics = {
        "total_clicks": 10,
        "clicks_over_time": [{"date": "2024-01-15", "count": 10}],
        "device_breakdown": [{"device": "Desktop", "count": 7}, {"device": "Mobile/Tablet", "count": 3}],
        "browser_breakdown": [{"browser": "Chrome", "count": 6}, {"browser": "Safari", "count": 4}],
        "referrer_breakdown": [{"referrer": "Direct", "count": 5}, {"referrer": "https://google.com", "count": 5}],
        "hourly_pattern": [{"hour": 10, "count": 5}, {"hour": 14, "count": 5}],
    }
    
    mocker.patch('src.main.get_full_analytics', return_value=mock_analytics)
    
    response = client.get("/analytics/1")
    
    assert response.status_code == 200
    data = response.json()
    assert data["total_clicks"] == 10
    assert len(data["device_breakdown"]) == 2


def test_analytics_endpoint_no_data(client, test_db, mocker):
    mock_analytics = {
        "total_clicks": 0,
        "clicks_over_time": [],
        "device_breakdown": [],
        "browser_breakdown": [],
        "referrer_breakdown": [],
        "hourly_pattern": [],
    }
    
    mocker.patch('src.main.get_full_analytics', return_value=mock_analytics)
    
    response = client.get("/analytics/999")
    
    assert response.status_code == 200
    data = response.json()
    assert data["total_clicks"] == 0


@patch('src.analytics.requests.post')
def test_ai_insight_endpoint(mock_post, client, test_db, mocker):
    # Mock AI API response
    mock_post.return_value.status_code = 200
    mock_post.return_value.json.return_value = {
        "choices": [{
            "message": {"content": "This URL received moderate traffic from desktop users."}
        }]
    }
    
    # Mock database queries
    mocker.patch('src.analytics.get_raw_visits', return_value=[])
    mocker.patch('src.analytics.get_basic_stats', return_value=(0, []))
    mocker.patch('src.analytics.get_top_referrers', return_value=[])
    
    response = client.post("/ai/insight", json={"url_id": 1})
    
    assert response.status_code == 200
    data = response.json()
    assert "insight" in data
