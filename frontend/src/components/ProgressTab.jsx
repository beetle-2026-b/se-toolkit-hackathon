import React from 'react';

function ProgressTab({ stats, scoredStats, progress, deckName }) {
  const boxColors = ['#e74c3c', '#f39c12', '#f1c40f', '#3498db', '#27ae60'];
  const boxLabels = ['Box 1 (New)', 'Box 2 (Learning)', 'Box 3 (Familiar)', 'Box 4 (Proficient)', 'Box 5 (Mastered)'];

  const totalCards = progress?.total_cards || 0;
  const masteryPercentage = progress?.mastery_percentage || 0;
  const boxDistribution = progress?.box_distribution || {1: 0, 2: 0, 3: 0, 4: 0, 5: 0};

  const renderBoxChart = () => {
    const total = Object.values(boxDistribution).reduce((sum, val) => sum + val, 0);
    if (total === 0) {
      return <p className="placeholder-text">No cards yet</p>;
    }

    return (
      <>
        <div className="box-chart">
          {Object.entries(boxDistribution).map(([box, count], index) => {
            const width = total > 0 ? (count / total * 100) || 1 : 0;
            return (
              <div
                key={box}
                className="box-segment"
                style={{ width: `${width}%`, background: boxColors[index] }}
                title={`${boxLabels[index]}: ${count}`}
              />
            );
          })}
        </div>
        <div className="box-legend">
          {boxLabels.map((label, index) => (
            <div key={index} className="legend-item">
              <div className="legend-color" style={{ background: boxColors[index] }} />
              <span>{label}: {boxDistribution[index + 1]}</span>
            </div>
          ))}
        </div>
      </>
    );
  };

  return (
    <div className="progress-container">
      <h2>{deckName ? `${deckName} - Progress` : 'Learning Progress'}</h2>
      <div className="progress-overview">
        {scoredStats && (
          <>
            <div className="mastery-card">
              <h3>Average Score</h3>
              <p>{scoredStats.average_score} / 10</p>
            </div>
            <div className="stat-card">
              <h3>Total Answered</h3>
              <p>{scoredStats.total_answered}</p>
            </div>
            <div className="stat-card">
              <h3>Correct (8-10)</h3>
              <p className="text-success">{scoredStats.correct_count}</p>
            </div>
            <div className="stat-card">
              <h3>Partial (5-7)</h3>
              <p style={{ color: '#f39c12' }}>{scoredStats.partial_count}</p>
            </div>
            <div className="stat-card">
              <h3>Incorrect (1-4)</h3>
              <p className="text-danger">{scoredStats.incorrect_count}</p>
            </div>
          </>
        )}
        {stats && (
          <>
            <div className="stat-card">
              <h3>Total Cards</h3>
              <p>{stats.total_cards}</p>
            </div>
            <div className="stat-card">
              <h3>Studied Today</h3>
              <p>{stats.studied_today}</p>
            </div>
          </>
        )}
      </div>

      <div className="box-distribution">
        <h3>Leitner Box Distribution</h3>
        {renderBoxChart()}
      </div>
    </div>
  );
}

export default ProgressTab;
