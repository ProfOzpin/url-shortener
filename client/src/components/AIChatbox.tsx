import React, { useState, useRef, useEffect } from 'react';
import api from '../api';

interface Message {
  role: 'user' | 'ai';
  content: string;
}

interface AIChatboxProps {
  urlId: number;
  context: 'general' | { graph: string } | null;
  onClose: () => void;
}

export const AIChatbox: React.FC<AIChatboxProps> = ({ urlId, context, onClose }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (context && context !== 'general') {
      // Auto-fetch AI overview for specific graph
      fetchGraphInsight(context.graph);
    }
  }, [context]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchGraphInsight = async (graphType: string) => {
    setLoading(true);
    try {
      const { data } = await api.post('/ai/graph-insight', { url_id: urlId, graph_type: graphType });
      setMessages(prev => [...prev, { role: 'ai', content: data.insight }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'ai', content: 'Failed to generate insight.' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      const { data } = await api.post('/ai/chat', {
        url_id: urlId,
        message: userMessage,
        context: typeof context === 'object' ? context.graph : 'general',
      });
      setMessages(prev => [...prev, { role: 'ai', content: data.response }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'ai', content: 'Error: Could not process your request.' }]);
    } finally {
      setLoading(false);
    }
  };

  if (minimized) {
    return (
      <div className="ai-chatbox minimized" onClick={() => setMinimized(false)}>
        <span>💬 AI Assistant</span>
      </div>
    );
  }

  return (
    <div className="ai-chatbox">
      <div className="chatbox-header">
        <h4>✨ AI Analytics Assistant</h4>
        <div className="chatbox-controls">
          <button onClick={() => setMinimized(true)}>−</button>
          <button onClick={onClose}>×</button>
        </div>
      </div>

      <div className="chatbox-messages">
        {messages.length === 0 && (
          <div className="welcome-message">
            <p>👋 Hi! I'm your AI analytics assistant.</p>
            <p>Ask me anything about your link's performance!</p>
          </div>
        )}
        {messages.map((msg, idx) => (
          <div key={idx} className={`message ${msg.role}`}>
            <p>{msg.content}</p>
          </div>
        ))}
        {loading && (
          <div className="message ai">
            <p>Thinking...</p>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="chatbox-input">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Ask about your analytics..."
          disabled={loading}
        />
        <button onClick={handleSend} disabled={loading || !input.trim()}>
          Send
        </button>
      </div>
    </div>
  );
};
