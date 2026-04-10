import React, { useState, useEffect } from 'react';
import { getStudyStats, getQuizStats, clearAllProgress } from '../services/api';

function ProgressTab({ deckName }) {
  const [studyStats, setStudyStats] = useState(null);
  const [quizStats, setQuizStats] = useState(null);
  const [clearing, setClearing] = useState(false);

  const fetchStats = async () => {
    try {
      const [sRes, qRes] = await Promise.all([
        getStudyStats(),
        getQuizStats()
      ]);
      setStudyStats(sRes);
      setQuizStats(qRes);
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleClearAll = async () => {
    if (!confirm('Clear all progress? This resets all cards and removes all study history.')) return;
    setClearing(true);
    try {
      await clearAllProgress();
      await fetchStats();
    } catch (err) {
      alert('Failed to clear progress.');
    } finally {
      setClearing(false);
    }
  };

  const s = studyStats || {};
  const q = quizStats || {};

  return (
    <div className="progress-container">
      <h2>{deckName ? `${deckName} - Progress` : 'Learning Progress'}</h2>

      {/* Study Mode Section */}
      <h3 className="stats-section-title">Study Mode</h3>
      <div className="progress-overview">
        <div className="stat-card">
          <h3>Total Cards</h3>
          <p>{s.total_cards || 0}</p>
        </div>
        <div className="stat-card">
          <h3>Studied Today</h3>
          <p>{s.studied_today || 0}</p>
        </div>
        <div className="stat-card">
          <h3>Correct</h3>
          <p className="text-success">{s.correct_today || 0}</p>
        </div>
        <div className="stat-card">
          <h3>Partial</h3>
          <p style={{ color: '#f39c12' }}>{s.partial_today || 0}</p>
        </div>
        <div className="stat-card">
          <h3>Incorrect</h3>
          <p className="text-danger">{s.incorrect_today || 0}</p>
        </div>
      </div>

      {/* AI Quiz Mode Section */}
      <h3 className="stats-section-title">AI Quiz Mode</h3>
      <div className="progress-overview">
        <div className="stat-card">
          <h3>Total Answered</h3>
          <p>{q.total_answered || 0}</p>
        </div>
        <div className="stat-card">
          <h3>Correct</h3>
          <p className="text-success">{q.correct_count || 0}</p>
        </div>
        <div className="stat-card">
          <h3>Partial</h3>
          <p style={{ color: '#f39c12' }}>{q.partial_count || 0}</p>
        </div>
        <div className="stat-card">
          <h3>Incorrect</h3>
          <p className="text-danger">{q.incorrect_count || 0}</p>
        </div>
      </div>

      <div className="progress-section-actions">
        <button className="btn-small" onClick={handleClearAll} disabled={clearing}>
          {clearing ? 'Clearing...' : 'Refresh Progress'}
        </button>
      </div>
    </div>
  );
}

export default ProgressTab;
