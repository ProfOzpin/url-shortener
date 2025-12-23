import React from 'react';
import { Line, Bar, Pie, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

interface AnalyticsChartsProps {
  data: any;
  onAIOverview: (graphType: string) => void;
}

export const AnalyticsCharts: React.FC<AnalyticsChartsProps> = ({ data, onAIOverview }) => {
  const clicks = data.clicks_over_time ?? [];
  const devices = data.device_breakdown ?? [];
  const browsers = data.browser_breakdown ?? [];
  const referrers = data.referrer_breakdown ?? [];
  const hourly = data.hourly_pattern ?? [];

  const clicksOverTimeData = {
    labels: clicks.map((d: any) => d.date ?? d.timestamp),
    datasets: [{
      label: 'Clicks',
      data: clicks.map((d: any) => d.count),
      borderColor: 'rgb(75, 192, 192)',
      backgroundColor: 'rgba(75, 192, 192, 0.2)',
    }],
  };

  const deviceData = {
    labels: devices.map((d: any) => d.device),
    datasets: [{
      data: devices.map((d: any) => d.count),
      backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0'],
    }],
  };

  const browserData = {
    labels: browsers.map((d: any) => d.browser),
    datasets: [{
      label: 'Browser Usage',
      data: browsers.map((d: any) => d.count),
      backgroundColor: 'rgba(153, 102, 255, 0.6)',
    }],
  };

  const referrerData = {
    labels: referrers.map((d: any) => d.referer ?? d.referrer ?? 'Direct'),
    datasets: [{
      data: referrers.map((d: any) => d.count),
      backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF'],
    }],
  };

  const hourlyData = {
    labels: hourly.map((d: any) => `${d.hour}:00`),
    datasets: [{
      label: 'Clicks by Hour',
      data: hourly.map((d: any) => d.count),
      backgroundColor: 'rgba(255, 159, 64, 0.6)',
    }],
  };

  return (
    <div className="charts-grid">
      <div className="chart-card">
        <div className="chart-header">
          <h3>📈 Clicks Over Time</h3>
          <button className="ai-btn" onClick={() => onAIOverview('clicks_over_time')}>
            ✨ AI Overview
          </button>
        </div>
        <Line data={clicksOverTimeData} options={{ responsive: true, maintainAspectRatio: false }} />
      </div>

      <div className="chart-card">
        <div className="chart-header">
          <h3>📱 Device Breakdown</h3>
          <button className="ai-btn" onClick={() => onAIOverview('device_breakdown')}>
            ✨ AI Overview
          </button>
        </div>
        <Pie data={deviceData} options={{ responsive: true, maintainAspectRatio: false }} />
      </div>

      <div className="chart-card">
        <div className="chart-header">
          <h3>🌐 Browser Usage</h3>
          <button className="ai-btn" onClick={() => onAIOverview('browser_breakdown')}>
            ✨ AI Overview
          </button>
        </div>
        <Bar data={browserData} options={{ responsive: true, maintainAspectRatio: false }} />
      </div>

      <div className="chart-card">
        <div className="chart-header">
          <h3>🔗 Referrer Sources</h3>
          <button className="ai-btn" onClick={() => onAIOverview('referrer_breakdown')}>
            ✨ AI Overview
          </button>
        </div>
        <Doughnut data={referrerData} options={{ responsive: true, maintainAspectRatio: false }} />
      </div>

      <div className="chart-card full-width">
        <div className="chart-header">
          <h3>🕐 Hourly Click Pattern</h3>
          <button className="ai-btn" onClick={() => onAIOverview('hourly_pattern')}>
            ✨ AI Overview
          </button>
        </div>
        <Bar data={hourlyData} options={{ responsive: true, maintainAspectRatio: false }} />
      </div>

      <div className="stats-summary">
        <div className="stat-box">
          <h4>Total Clicks</h4>
          <p className="big-number">{data.total_clicks}</p>
        </div>
      </div>
    </div>
  );
};
