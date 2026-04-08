import React, { useState, useEffect } from 'react';
import { selfRateAnswer } from '../services/api';

function StudyTab({ decks, selectedDeckId, onRatingComplete }) {
  const [phase, setPhase] = useState('select'); // 'select' | 'studying' | 'done'
  const [deckId, setDeckId] = useState(selectedDeckId);
  const [deckCards, setDeckCards] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [stats, setStats] = useState({ correct: 0, partial: 0, incorrect: 0 });

  const startSession = (id) => {
    if (!id) return;
    setDeckId(id);
    setPhase('studying');
    setCurrentIndex(0);
    setRevealed(false);
    setStats({ correct: 0, partial: 0, incorrect: 0 });
    // Load cards for this deck
    const deck = decks.find(d => d.id === id);
    if (deck && deck.card_count > 0) {
      // We'll fetch cards via API
      fetch(`/api/cards?deck_id=${id}`)
        .then(r => r.json())
        .then(cards => {
          const shuffled = [...cards].sort(() => Math.random() - 0.5);
          setDeckCards(shuffled);
        });
    } else {
      setDeckCards([]);
    }
  };

  const handleRate = async (rating) => {
    const card = deckCards[currentIndex];
    if (!card) return;

    try {
      await selfRateAnswer(card.id, rating);
    } catch (err) {
      console.error('Error rating:', err);
    }

    setStats(prev => ({
      ...prev,
      [rating]: prev[rating] + 1
    }));

    if (currentIndex + 1 >= deckCards.length) {
      setPhase('done');
    } else {
      setCurrentIndex(prev => prev + 1);
      setRevealed(false);
    }
  };

  const handleNext = () => {
    // Skip without rating - just mark as incorrect for stats
    if (currentIndex + 1 >= deckCards.length) {
      setPhase('done');
    } else {
      setCurrentIndex(prev => prev + 1);
      setRevealed(false);
    }
  };

  const handleFinish = () => {
    setPhase('select');
    if (onRatingComplete) onRatingComplete();
  };

  const currentCard = deckCards[currentIndex];
  const totalAnswered = stats.correct + stats.partial + stats.incorrect;

  const getPercentage = (count) => {
    if (totalAnswered === 0) return 0;
    return Math.round((count / totalAnswered) * 100);
  };

  if (phase === 'select') {
    return (
      <div className="study-container">
        <h2>Study Mode</h2>
        <p className="subtitle">Choose a theme to study from</p>
        <div className="theme-selection">
          {decks.length === 0 ? (
            <p className="placeholder-text">No decks created yet. Create some decks first!</p>
          ) : (
            decks.map(deck => (
              <button
                key={deck.id}
                className="theme-btn"
                onClick={() => startSession(deck.id)}
              >
                <span className="theme-name">{deck.name}</span>
                <span className="theme-count">{deck.card_count} cards</span>
              </button>
            ))
          )}
        </div>
      </div>
    );
  }

  if (phase === 'done') {
    return (
      <div className="study-container">
        <div className="completion-screen">
          <h2>All Done!</h2>
          <p className="completion-text">
            You answered all {deckCards.length} questions from this theme.
          </p>
          <div className="session-stats">
            <div className="session-stat correct">
              <h3>Correct</h3>
              <p>{stats.correct}</p>
              <span>{getPercentage(stats.correct)}%</span>
            </div>
            <div className="session-stat partial">
              <h3>Partially Correct</h3>
              <p>{stats.partial}</p>
              <span>{getPercentage(stats.partial)}%</span>
            </div>
            <div className="session-stat incorrect">
              <h3>Incorrect</h3>
              <p>{stats.incorrect}</p>
              <span>{getPercentage(stats.incorrect)}%</span>
            </div>
          </div>
          <div className="completion-actions">
            <button className="btn-primary" onClick={() => startSession(deckId)}>
              Study This Theme Again
            </button>
            <button className="btn-secondary" onClick={handleFinish}>
              Choose Different Theme
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!currentCard) {
    return (
      <div className="study-container">
        <p className="placeholder-text">Loading cards...</p>
      </div>
    );
  }

  return (
    <div className="study-container">
      <div className="study-header">
        <span className="study-progress">
          {currentIndex + 1} / {deckCards.length}
        </span>
        <button className="btn-small" onClick={handleFinish}>Change Theme</button>
      </div>

      <div className="flashcard">
        <div className="question">{currentCard.question}</div>
        {revealed && (
          <div className="answer">{currentCard.answer}</div>
        )}
      </div>

      <div className="study-controls">
        {!revealed ? (
          <>
            <button className="btn-secondary" onClick={handleNext}>
              Next
            </button>
            <button className="btn-primary" onClick={() => setRevealed(true)}>
              Show Answer
            </button>
          </>
        ) : (
          <>
            <button className="btn-success" onClick={() => handleRate('correct')}>
              ✓ Correct
            </button>
            <button className="btn-warning" onClick={() => handleRate('partial')}>
              ◐ Partially Correct
            </button>
            <button className="btn-danger" onClick={() => handleRate('incorrect')}>
              ✗ Incorrect
            </button>
          </>
        )}
      </div>

      {/* Live Stats Below */}
      {totalAnswered > 0 && (
        <div className="live-stats">
          <h3>Session Stats</h3>
          <div className="live-stats-grid">
            <div className="live-stat correct">
              <span className="live-stat-label">Correct</span>
              <span className="live-stat-count">{stats.correct}</span>
              <span className="live-stat-pct">{getPercentage(stats.correct)}%</span>
            </div>
            <div className="live-stat partial">
              <span className="live-stat-label">Partially Correct</span>
              <span className="live-stat-count">{stats.partial}</span>
              <span className="live-stat-pct">{getPercentage(stats.partial)}%</span>
            </div>
            <div className="live-stat incorrect">
              <span className="live-stat-label">Incorrect</span>
              <span className="live-stat-count">{stats.incorrect}</span>
              <span className="live-stat-pct">{getPercentage(stats.incorrect)}%</span>
            </div>
          </div>
          <div className="live-stats-bar">
            <div
              className="live-stat-bar-segment correct"
              style={{ width: `${getPercentage(stats.correct)}%` }}
            />
            <div
              className="live-stat-bar-segment partial"
              style={{ width: `${getPercentage(stats.partial)}%` }}
            />
            <div
              className="live-stat-bar-segment incorrect"
              style={{ width: `${getPercentage(stats.incorrect)}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default StudyTab;
