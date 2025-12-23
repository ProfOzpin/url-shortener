import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../api';
import { AnalyticsCharts } from '../components/AnalyticsCharts';
import { AIChatbox } from '../components/AIChatbox';
import '../styles/Analytics.css';

interface Url {
  id: number;
  original_url: string;
  short_code: string;
}

interface AnalyticsData {
  total_clicks: number;
  clicks_over_time: Array<{ date: string; count: number }>;
  device_breakdown: Array<{ device: string; count: number }>;
  browser_breakdown: Array<{ browser: string; count: number }>;
  referrer_breakdown: Array<{ referrer: string; count: number }>;
  geographic_data: Array<{ country: string; count: number }>;
  hourly_pattern: Array<{ hour: number; count: number }>;
}

export const Analytics: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const urlIdFromQuery = searchParams.get('url_id');

  const [urls, setUrls] = useState<Url[]>([]);
  const [selectedUrl, setSelectedUrl] = useState<Url | null>(null);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [aiContext, setAiContext] = useState<'general' | { graph: string } | null>(null);

  useEffect(() => {
    fetchUrls();
  }, []);

  useEffect(() => {
    if (urlIdFromQuery && urls.length > 0) {
      const url = urls.find(u => u.id === parseInt(urlIdFromQuery));
      if (url) handleSelectUrl(url);
    }
  }, [urlIdFromQuery, urls]);

  const fetchUrls = async () => {
    try {
      const { data } = await api.get('/urls');
      setUrls(data);
    } catch (err) {
      console.error('Failed to fetch URLs', err);
    }
  };

  const handleSelectUrl = async (url: Url) => {
    setSelectedUrl(url);
    setLoading(true);
    try {
      const { data } = await api.get(`/analytics/${url.id}`);
      setAnalyticsData(data);
    } catch (err) {
      console.error('Failed to fetch analytics', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/');
  };

  return (
    <div className="analytics-page">
      {/* Header */}
      <header className="analytics-header">
        <h1>📊 Advanced Analytics</h1>
        <div>
          <button onClick={() => navigate('/dashboard')} className="back-btn">
            ← Back to Dashboard
          </button>
          <button onClick={handleLogout} className="logout-btn">
            Logout
          </button>
        </div>
      </header>

      <div className="analytics-container">
        {/* Sidebar: URL List */}
        <aside className="url-sidebar">
          <h3>Your Shortened URLs</h3>
          {urls.length === 0 ? (
            <p className="no-urls">No URLs yet</p>
          ) : (
            <ul className="url-list">
              {urls.map(url => (
                <li
                  key={url.id}
                  className={selectedUrl?.id === url.id ? 'active' : ''}
                  onClick={() => handleSelectUrl(url)}
                >
                  <div className="url-item">
                    <span className="short-code">/{url.short_code}</span>
                    <span className="original-url">{url.original_url}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </aside>

        {/* Main Content: Graphs */}
        <main className="analytics-main">
          {!selectedUrl ? (
            <div className="placeholder">
              <h2>Select a URL from the sidebar to view analytics</h2>
            </div>
          ) : loading ? (
            <div className="loading">Loading analytics...</div>
          ) : analyticsData ? (
            <AnalyticsCharts 
              data={analyticsData} 
              onAIOverview={(graphType) => setAiContext({ graph: graphType })}
            />
          ) : (
            <div className="error">Failed to load analytics data</div>
          )}
        </main>

        {/* AI Chatbox - Bottom Right */}
        {selectedUrl && (
          <AIChatbox 
            urlId={selectedUrl.id} 
            context={aiContext}
            onClose={() => setAiContext(null)}
          />
        )}
      </div>
    </div>
  );
};
