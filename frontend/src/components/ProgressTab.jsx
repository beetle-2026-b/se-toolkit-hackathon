import React from 'react';

function ProgressTab({ stats, progress, deckName }) {
  const p = progress || {};

  return (
    <div className="progress-container">
      <h2>{deckName ? `${deckName} - Progress` : 'Learning Progress'}</h2>

      <div className="progress-overview">
        {/* Row 1: Total stats */}
        <div className="stat-card">
          <h3>Total Cards</h3>
          <p>{p.total_cards || 0}</p>
        </div>
        <div className="stat-card">
          <h3>Total Learned</h3>
          <p className="text-success">{p.total_learned || 0}</p>
        </div>
        <div className="stat-card">
          <h3>Average Score</h3>
          <p>{p.average_score || 0} / 10</p>
        </div>

        {/* Row 2: Today stats */}
        <div className="stat-card today-highlight">
          <h3>Studied Today</h3>
          <p>{p.studied_today || 0}</p>
        </div>
        <div className="stat-card">
          <h3>Correct Today</h3>
          <p className="text-success">{p.correct_today || 0}</p>
        </div>
        <div className="stat-card">
          <h3>Partial Today</h3>
          <p style={{ color: '#f39c12' }}>{p.partial_today || 0}</p>
        </div>
        <div className="stat-card">
          <h3>Incorrect Today</h3>
          <p className="text-danger">{p.incorrect_today || 0}</p>
        </div>
      </div>

      <button id="refresh-stats-btn" className="btn-secondary">Refresh Progress</button>
    </div>
  );
}

export default ProgressTab;
