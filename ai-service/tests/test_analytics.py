import pytest
from datetime import datetime


class TestUserAgentParsing:
    def test_parse_user_agent_chrome_desktop(self):
        from src.analytics import parse_user_agent
        
        ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0"
        result = parse_user_agent(ua)
        
        assert result["device_type"] == "Desktop"
        assert result["os"] == "Windows"
        assert result["browser"] == "Chrome"

    def test_parse_user_agent_safari_iphone(self):
        from src.analytics import parse_user_agent
        
        ua = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Safari/17.0"
        result = parse_user_agent(ua)
        
        assert result["device_type"] == "Mobile/Tablet"
        assert result["os"] in ["iOS", "macOS"]
        assert result["browser"] == "Safari"

    def test_parse_user_agent_firefox_linux(self):
        from src.analytics import parse_user_agent
        
        ua = "Mozilla/5.0 (X11; Linux x86_64; rv:109.0) Firefox/120.0"
        result = parse_user_agent(ua)
        
        assert result["device_type"] == "Desktop"
        assert result["os"] == "Linux"
        assert result["browser"] == "Firefox"

    def test_parse_user_agent_bot(self):
        from src.analytics import parse_user_agent
        
        ua = "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)"
        result = parse_user_agent(ua)
        
        assert result["browser"] == "Bot/Crawler"

    def test_parse_user_agent_none(self):
        from src.analytics import parse_user_agent
        
        result = parse_user_agent(None)
        
        assert result["device_type"] is None
        assert result["os"] is None
        assert result["browser"] is None


class TestVisitEnrichment:
    def test_enrich_visit_data_single_visit(self):
        from src.analytics import enrich_visit_data
        
        # Create a mock visit object (simulating SQLAlchemy Row)
        class MockVisit:
            id = 1
            url_id = 1
            clicked_at = datetime(2024, 1, 15, 10, 30, 0)
            user_agent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0"
            visitor_ip_hash = "abc123hash"
            referer = "https://google.com"
        
        raw_visits = [MockVisit()]
        enriched = enrich_visit_data(raw_visits)
        
        assert len(enriched) == 1
        assert enriched[0].device_type == "Desktop"
        assert enriched[0].os == "Windows"
        assert enriched[0].browser == "Chrome"
        assert enriched[0].referer == "https://google.com"

    def test_enrich_visit_data_multiple_visits(self):
        from src.analytics import enrich_visit_data
        
        class MockVisit:
            def __init__(self, ua, ref):
                self.id = 1
                self.url_id = 1
                self.clicked_at = datetime.now()
                self.user_agent = ua
                self.visitor_ip_hash = "hash"
                self.referer = ref
        
        raw_visits = [
            MockVisit("Mozilla/5.0 (Windows) Chrome", "https://google.com"),
            MockVisit("Mozilla/5.0 (iPhone) Safari", None),
        ]
        
        enriched = enrich_visit_data(raw_visits)
        
        assert len(enriched) == 2
        assert enriched[0].referer == "https://google.com"
        assert enriched[1].referer is None


class TestAnalytics:
    def test_get_full_analytics_empty(self, test_db, mocker):
        """Test analytics with no visit data"""
        from src.analytics import get_full_analytics
        
        # Mock get_raw_visits to return empty list
        mocker.patch('src.analytics.get_raw_visits', return_value=[])
        
        result = get_full_analytics(url_id=999, db=test_db)
        
        assert result["total_clicks"] == 0
        assert result["clicks_over_time"] == []
        assert result["device_breakdown"] == []
        assert result["browser_breakdown"] == []
        assert result["referrer_breakdown"] == []
        assert result["hourly_pattern"] == []

    def test_get_full_analytics_with_visits(self, test_db, mocker):
        """Test analytics with mock visit data"""
        from src.analytics import get_full_analytics
        
        class MockVisit:
            def __init__(self, hour, device_ua, browser_ua):
                self.id = 1
                self.url_id = 1
                self.clicked_at = datetime(2024, 1, 15, hour, 0, 0)
                self.user_agent = f"Mozilla/5.0 ({device_ua}) {browser_ua}"
                self.visitor_ip_hash = "hash123"
                self.referer = "https://google.com"
        
        mock_visits = [
            MockVisit(10, "Windows NT 10.0", "Chrome/120.0"),
            MockVisit(11, "Windows NT 10.0", "Chrome/120.0"),
            MockVisit(14, "iPhone", "Safari/17.0"),
        ]
        
        mocker.patch('src.analytics.get_raw_visits', return_value=mock_visits)
        
        result = get_full_analytics(url_id=1, db=test_db)
        
        assert result["total_clicks"] == 3
        assert len(result["clicks_over_time"]) == 1  # All same day
        assert len(result["hourly_pattern"]) == 3  # Hours 10, 11, 14
        
        # Check device breakdown
        devices = [item["device"] for item in result["device_breakdown"]]
        assert "Desktop" in devices
        assert "Mobile/Tablet" in devices
