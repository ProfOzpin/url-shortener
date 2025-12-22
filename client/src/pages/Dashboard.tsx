import React, { useEffect, useState } from 'react';
import api from '../api';
import { useNavigate } from 'react-router-dom';

interface Url {
  id: number;
  original_url: string;
  short_code: string;
}

export const Dashboard: React.FC = () => {
  const [urls, setUrls] = useState<Url[]>([]);
  const [newUrl, setNewUrl] = useState('');
  const [selectedUrl, setSelectedUrl] = useState<Url | null>(null);
  const [insight, setInsight] = useState<string>('');
  const [loadingInsight, setLoadingInsight] = useState(false);
  const navigate = useNavigate();

  useEffect(() => { fetchUrls(); }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/');
  };

  const fetchUrls = async () => {
    try {
      const { data } = await api.get('/urls');
      setUrls(data);
    } catch (err) { console.error(err); }
  };

  const createUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/shorten', { url: newUrl });
      setNewUrl('');
      fetchUrls();
    } catch (err) { alert('Invalid URL'); }
  };

  const generateInsight = async (id: number) => {
    setLoadingInsight(true);
    setInsight('');
    try {
      const { data } = await api.post('/insight', { url_id: id });
      setInsight(data.insight);
    } catch (err) {
      setInsight('Could not generate insight. Try clicking the link a few times first!');
    } finally {
      setLoadingInsight(false);
    }
  };

  const handleSelect = (u: Url) => {
    setSelectedUrl(u);
    setInsight(''); // Clear previous insight
    generateInsight(u.id); // Auto-trigger AI on selection
  };

  return (
    <div className="container">
      {/* Navbar inside Dashboard */}
      <nav className="navbar">
        <div className="brand">URLShortener.ai</div>
        <button className="secondary" onClick={handleLogout} style={{ padding: '8px 16px' }}>Logout</button>
      </nav>

      {/* Hero Input */}
      <div style={{ maxWidth: '600px', margin: '0 auto 60px auto', textAlign: 'center' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '10px' }}>Shorten your links</h1>
        <p style={{ color: '#666', marginBottom: '30px' }}>Paste a long URL to create a short, trackable link.</p>
        
        <form onSubmit={createUrl} className="hero-input">
          <input 
            type="text" 
            placeholder="https://example.com/very-long-url..." 
            value={newUrl} 
            onChange={e => setNewUrl(e.target.value)}
            autoFocus
          />
          <button type="submit">Shorten</button>
        </form>
      </div>

      {/* Main Grid */}
      <div className="grid-layout">
        
        {/* Left Column: List */}
        <div>
          <h3 style={{ marginBottom: '20px', fontSize: '1.2rem' }}>Your History</h3>
          {urls.length === 0 && <p style={{color: '#999'}}>No links created yet.</p>}
          
          {urls.map(u => (
            <div 
              key={u.id} 
              className={`link-item ${selectedUrl?.id === u.id ? 'active' : ''}`}
              onClick={() => handleSelect(u)}
            >
              <div>
                <div className="short-code">/{u.short_code}</div>
                <div className="long-url">{u.original_url}</div>
              </div>
              <div style={{ fontSize: '0.8rem', color: '#999' }}>
                 &rarr;
              </div>
            </div>
          ))}
        </div>

        {/* Right Column: Details & AI */}
        <div>
          {!selectedUrl ? (
            <div className="card" style={{ textAlign: 'center', padding: '60px 20px', color: '#888' }}>
              <p>Select a link from the left to view AI analytics.</p>
            </div>
          ) : (
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ margin: 0 }}>/{selectedUrl.short_code}</h2>
                <a 
                  href={`http://localhost:3000/${selectedUrl.short_code}`} 
                  target="_blank" 
                  rel="noreferrer"
                  style={{ textDecoration: 'none', color: 'blue', fontSize: '0.9rem' }}
                >
                  Visit Link &nearr;
                </a>
              </div>

              <hr style={{ border: 'none', borderTop: '1px solid #eee', margin: '20px 0' }} />

              {/* AI Section */}
              <div className="ai-box">
                <div className="ai-header">
                  <span>✨ Mistral AI Insight</span>
                </div>
                
                {loadingInsight ? (
                  <div className="ai-content loading-dots">
                    Analyzing traffic patterns, device headers, and timestamps...
                  </div>
                ) : (
                  <div className="ai-content">
                    {insight || "No data available yet."}
                  </div>
                )}
              </div>
              
              <p style={{ marginTop: '20px', fontSize: '0.8rem', color: '#888' }}>
                * Tip: Visit the link from different devices to see the AI generate smarter insights.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
