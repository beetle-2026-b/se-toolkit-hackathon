import React, { useState, useEffect } from 'react';
import { getNextQuizCard, checkQuizAnswer, getQuizStats, getQuizHistory } from '../services/api';

function AIQuizTab({ decks }) {
  const [deckId, setDeckId] = useState(null);
  const [phase, setPhase] = useState('select'); // 'select' | 'quiz' | 'done'
  const [quizCards, setQuizCards] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sessionStats, setSessionStats] = useState({ correct: 0, partial: 0, incorrect: 0, totalScore: 0, count: 0 });
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);

  const startSession = (id) => {
    if (!id) return;
    setDeckId(id);
    setPhase('quiz');
    setCurrentIndex(0);
    setResult(null);
    setUserAnswer('');
    setError('');
    setSessionStats({ correct: 0, partial: 0, incorrect: 0, totalScore: 0, count: 0 });
    setHistory([]);
    setShowHistory(false);

    fetch(`/api/cards?deck_id=${id}`)
      .then(r => r.json())
      .then(cards => {
        const shuffled = [...cards].sort(() => Math.random() - 0.5);
        setQuizCards(shuffled);
      });
  };

  const loadNextCard = () => {
    if (currentIndex + 1 >= quizCards.length) {
      setPhase('done');
    } else {
      setCurrentIndex(prev => prev + 1);
      setResult(null);
      setUserAnswer('');
      setError('');
    }
  };

  const handleCheck = async () => {
    if (!userAnswer.trim()) {
      alert('Please type your answer before checking.');
      return;
    }
    if (!quizCards[currentIndex]) return;

    setLoading(true);
    setError('');
    try {
      const card = quizCards[currentIndex];
      const resultData = await checkQuizAnswer(card.id, userAnswer);
      setResult(resultData);

      // Update session stats based on score
      setSessionStats(prev => {
        let category;
        if (resultData.score >= 8) category = 'correct';
        else if (resultData.score >= 5) category = 'partial';
        else category = 'incorrect';

        return {
          ...prev,
          [category]: prev[category] + 1,
          totalScore: prev.totalScore + resultData.score,
          count: prev.count + 1
        };
      });

      // Add to session history
      setHistory(prev => [...prev, {
        question: card.question,
        correctAnswer: card.answer,
        userAnswer,
        ...resultData
      }]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    loadNextCard();
  };

  const handleFinish = () => {
    setPhase('select');
  };

  const getPercentage = (count) => {
    const total = sessionStats.correct + sessionStats.partial + sessionStats.incorrect;
    if (total === 0) return 0;
    return Math.round((count / total) * 100);
  };

  const avgScore = sessionStats.count > 0
    ? Math.round(sessionStats.totalScore / sessionStats.count * 10) / 10
    : 0;

  // Theme selection screen
  if (phase === 'select') {
    return (
      <div className="ai-quiz-container">
        <h2>AI Quiz Mode</h2>
        <p className="subtitle">Type your answer and let AI evaluate it!</p>
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

  // Completion screen
  if (phase === 'done') {
    const deck = decks.find(d => d.id === deckId);
    return (
      <div className="ai-quiz-container">
        <div className="completion-screen">
          <h2>Quiz Complete!</h2>
          <p className="completion-text">
            You answered all {quizCards.length} questions from {deck?.name || 'this theme'}.
          </p>
          <div className="session-stats">
            <div className="session-stat correct">
              <h3>Average Score</h3>
              <p>{avgScore} / 10</p>
            </div>
            <div className="session-stat correct">
              <h3>Correct (8-10)</h3>
              <p>{sessionStats.correct}</p>
              <span>{getPercentage(sessionStats.correct)}%</span>
            </div>
            <div className="session-stat partial">
              <h3>Partial (5-7)</h3>
              <p>{sessionStats.partial}</p>
              <span>{getPercentage(sessionStats.partial)}%</span>
            </div>
            <div className="session-stat incorrect">
              <h3>Incorrect (1-4)</h3>
              <p>{sessionStats.incorrect}</p>
              <span>{getPercentage(sessionStats.incorrect)}%</span>
            </div>
          </div>
          <div className="completion-actions">
            <button className="btn-primary" onClick={() => startSession(deckId)}>
              Quiz This Theme Again
            </button>
            <button className="btn-secondary" onClick={handleFinish}>
              Choose Different Theme
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentCard = quizCards[currentIndex];
  if (!currentCard) {
    return (
      <div className="ai-quiz-container">
        <p className="placeholder-text">Loading...</p>
      </div>
    );
  }

  return (
    <div className="ai-quiz-container">
      <div className="study-header">
        <span className="study-progress">{currentIndex + 1} / {quizCards.length}</span>
        <button className="btn-small" onClick={handleFinish}>Change Theme</button>
      </div>

      <div className="flashcard">
        <div className="question">{currentCard.question}</div>
        {result && <div className="answer">{currentCard.answer}</div>}
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="study-controls">
        {!result ? (
          <>
            <textarea
              rows="3"
              value={userAnswer}
              onChange={(e) => setUserAnswer(e.target.value)}
              placeholder="Type your answer here..."
              className="quiz-answer-textarea"
              disabled={loading}
            />
            <button className="btn-primary" onClick={handleCheck} disabled={loading}>
              {loading ? 'Checking...' : 'Check'}
            </button>
          </>
        ) : (
          <>
            <div className="score-result">
              <div className="score-circle" style={{ borderColor: getScoreColor(result.score) }}>
                <span className="score-number" style={{ color: getScoreColor(result.score) }}>
                  {result.score}
                </span>
                <span className="score-total">/10</span>
              </div>
              <div className="score-label" style={{ color: getScoreColor(result.score) }}>
                {result.label}
              </div>
              <div className="score-comment">{result.comment}</div>
            </div>
            <button className="btn-primary" onClick={handleNext}>
              Next
            </button>
          </>
        )}
      </div>

      {/* Live Stats Below */}
      {sessionStats.count > 0 && (
        <div className="live-stats">
          <h3>Session Stats</h3>
          <div className="live-stats-grid">
            <div className="live-stat correct">
              <span className="live-stat-label">Average Score</span>
              <span className="live-stat-count">{avgScore} / 10</span>
            </div>
            <div className="live-stat correct">
              <span className="live-stat-label">Correct (8-10)</span>
              <span className="live-stat-count">{sessionStats.correct}</span>
              <span className="live-stat-pct">{getPercentage(sessionStats.correct)}%</span>
            </div>
            <div className="live-stat partial">
              <span className="live-stat-label">Partial (5-7)</span>
              <span className="live-stat-count">{sessionStats.partial}</span>
              <span className="live-stat-pct">{getPercentage(sessionStats.partial)}%</span>
            </div>
            <div className="live-stat incorrect">
              <span className="live-stat-label">Incorrect (1-4)</span>
              <span className="live-stat-count">{sessionStats.incorrect}</span>
              <span className="live-stat-pct">{getPercentage(sessionStats.incorrect)}%</span>
            </div>
          </div>
          <div className="live-stats-bar">
            <div
              className="live-stat-bar-segment correct"
              style={{ width: `${getPercentage(sessionStats.correct)}%` }}
            />
            <div
              className="live-stat-bar-segment partial"
              style={{ width: `${getPercentage(sessionStats.partial)}%` }}
            />
            <div
              className="live-stat-bar-segment incorrect"
              style={{ width: `${getPercentage(sessionStats.incorrect)}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function getScoreColor(score) {
  if (score >= 8) return '#27ae60';
  if (score >= 5) return '#f39c12';
  return '#e74c3c';
}

export default AIQuizTab;
