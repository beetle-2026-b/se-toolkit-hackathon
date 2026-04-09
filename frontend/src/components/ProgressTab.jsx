import React from 'react';

function ProgressTab({ stats, progress, deckName }) {
  const p = progress || {};

  return (
    <div className="progress-container">
      <h2>{deckName ? `${deckName} - Progress` : 'Learning Progress'}</h2>

      {/* Total Stats */}
      <h3 className="stats-section-title">Total</h3>
      <div className="progress-overview">
        <div className="stat-card">
          <h3>Total Cards</h3>
          <p>{p.total_cards || 0}</p>
        </div>
        <div className="stat-card">
          <h3>Total Learned</h3>
          <p className="text-success">{p.total_learned || 0}</p>
        </div>
      </div>

      {/* Today Stats */}
      <h3 className="stats-section-title">Today</h3>
      <div className="progress-overview">
        <div className="stat-card today-highlight">
          <h3>Studied</h3>
          <p>{p.studied_today || 0}</p>
        </div>
        <div className="stat-card">
          <h3>Correct</h3>
          <p className="text-success">{p.correct_today || 0}</p>
        </div>
        <div className="stat-card">
          <h3>Partial</h3>
          <p style={{ color: '#f39c12' }}>{p.partial_today || 0}</p>
        </div>
        <div className="stat-card">
          <h3>Incorrect</h3>
          <p className="text-danger">{p.incorrect_today || 0}</p>
        </div>
      </div>

      <button id="refresh-stats-btn" className="btn-secondary">Refresh Progress</button>
    </div>
  );
}

export default ProgressTab;
