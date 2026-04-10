import React, { useState, useEffect } from 'react';
import { getNextStudyCard, getCards, selfRateAnswer } from '../services/api';
import DeckSelection from './DeckSelection';

function StudyTab({ decks, selectedDeckId, onCardRated }) {
  const [phase, setPhase] = useState('select');
  const [deckId, setDeckId] = useState(null);
  const [deckCards, setDeckCards] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [stats, setStats] = useState({ correct: 0, partial: 0, incorrect: 0 });
  const [error, setError] = useState('');
  const [loadingCards, setLoadingCards] = useState(false);

  const startSession = async (id) => {
    if (!id) return;
    setDeckId(id);
    setPhase('studying');
    setCurrentIndex(0);
    setRevealed(false);
    setStats({ correct: 0, partial: 0, incorrect: 0 });
    setError('');
    setLoadingCards(true);

    try {
      const cardsData = await getCards(id);
      const shuffled = [...cardsData].sort(() => Math.random() - 0.5);
      setDeckCards(shuffled);
    } catch (err) {
      setError('Failed to load cards.');
    } finally {
      setLoadingCards(false);
    }
  };

  const handleRate = async (rating) => {
    const card = deckCards[currentIndex];
    if (!card) return;

    try {
      await selfRateAnswer(card.id, rating);
      if (onCardRated) onCardRated();
    } catch (err) {
      setError('Error rating answer.');
      return;
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
    if (currentIndex + 1 >= deckCards.length) {
      setPhase('done');
    } else {
      setCurrentIndex(prev => prev + 1);
      setRevealed(false);
    }
  };

  const handleFinish = () => {
    setPhase('select');
  };

  const getPercentage = (count) => {
    const total = stats.correct + stats.partial + stats.incorrect;
    if (total === 0) return 0;
    return Math.round((count / total) * 100);
  };

  const currentCard = deckCards[currentIndex];

  // Deck selection
  if (phase === 'select') {
    return (
      <div className="study-container">
        <h2>Study Mode</h2>
        <p className="subtitle">Choose a deck to study from</p>
        <DeckSelection
          decks={decks}
          onSelectDeck={startSession}
          showCreate={false}
        />
      </div>
    );
  }

  // Completion screen
  if (phase === 'done') {
    return (
      <div className="study-container">
        <div className="completion-screen">
          <h2>Session Complete!</h2>
          <p className="completion-text">
            You reviewed all {deckCards.length} cards from this deck.
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
            <button className="btn-primary" onClick={() => startSession(deckId)}>Study Again</button>
            <button className="btn-secondary" onClick={handleFinish}>Choose Deck</button>
          </div>
        </div>
      </div>
    );
  }

  if (loadingCards) {
    return (
      <div className="study-container">
        <p className="placeholder-text">Loading cards...</p>
      </div>
    );
  }

  if (!currentCard) {
    return (
      <div className="study-container">
        <p className="placeholder-text">No cards available in this deck.</p>
      </div>
    );
  }

  return (
    <div className="study-container">
      <div className="study-header">
        <span className="study-progress">{currentIndex + 1} / {deckCards.length}</span>
        <button className="btn-small" onClick={handleFinish}>Change Deck</button>
      </div>

      <div className="flashcard">
        <div className="question">{currentCard.question}</div>
        {revealed && <div className="answer">{currentCard.answer}</div>}
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="study-controls">
        {!revealed ? (
          <>
            <button className="btn-secondary" onClick={handleNext}>Next</button>
            <button className="btn-primary" onClick={() => setRevealed(true)}>Show Answer</button>
          </>
        ) : (
          <>
            <button className="btn-success" onClick={() => handleRate('correct')}>✓ Correct</button>
            <button className="btn-warning" onClick={() => handleRate('partial')}>◐ Partially Correct</button>
            <button className="btn-danger" onClick={() => handleRate('incorrect')}>✗ Incorrect</button>
          </>
        )}
      </div>

      {/* Live Stats Below */}
      {(stats.correct + stats.partial + stats.incorrect) > 0 && (
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
            <div className="live-stat-bar-segment correct" style={{ width: `${getPercentage(stats.correct)}%` }} />
            <div className="live-stat-bar-segment partial" style={{ width: `${getPercentage(stats.partial)}%` }} />
            <div className="live-stat-bar-segment incorrect" style={{ width: `${getPercentage(stats.incorrect)}%` }} />
          </div>
        </div>
      )}
    </div>
  );
}

export default StudyTab;
