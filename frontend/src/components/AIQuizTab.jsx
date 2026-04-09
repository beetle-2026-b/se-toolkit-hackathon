import React, { useState } from 'react';
import { checkQuizAnswer } from '../services/api';

function AIQuizTab({ decks }) {
  const [deckId, setDeckId] = useState(null);
  const [phase, setPhase] = useState('select');
  const [quizCards, setQuizCards] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [lastUserAnswer, setLastUserAnswer] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sessionStats, setSessionStats] = useState({ correct: 0, partial: 0, incorrect: 0 });

  const startSession = (id) => {
    if (!id) return;
    setDeckId(id);
    setPhase('quiz');
    setCurrentIndex(0);
    setResult(null);
    setUserAnswer('');
    setError('');
    setSessionStats({ correct: 0, partial: 0, incorrect: 0 });

    fetch(`/api/cards?deck_id=${id}`)
      .then(r => r.json())
      .then(cards => {
        const shuffled = [...cards].sort(() => Math.random() - 0.5);
        setQuizCards(shuffled);
      });
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

      if (!resultData.verdict) {
        setError('AI could not evaluate your answer. Please try again.');
        setLoading(false);
        return;
      }

      setResult({
        ...resultData,
        correctAnswer: card.answer,
        userAnswer: userAnswer
      });

      setLastUserAnswer(userAnswer);

      setSessionStats(prev => {
        let category;
        if (resultData.verdict === 'Correct') category = 'correct';
        else if (resultData.verdict === 'Partially correct') category = 'partial';
        else category = 'incorrect';

        return {
          ...prev,
          [category]: prev[category] + 1
        };
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (currentIndex + 1 >= quizCards.length) {
      setPhase('done');
    } else {
      setCurrentIndex(prev => prev + 1);
      setResult(null);
      setUserAnswer('');
      setError('');
    }
  };

  const handleFinish = () => {
    setPhase('select');
  };

  const getPercentage = (count) => {
    const total = sessionStats.correct + sessionStats.partial + sessionStats.incorrect;
    if (total === 0) return 0;
    return Math.round((count / total) * 100);
  };

  const currentCard = quizCards[currentIndex];

  // Theme selection
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
    const total = sessionStats.correct + sessionStats.partial + sessionStats.incorrect;
    return (
      <div className="ai-quiz-container">
        <div className="completion-screen">
          <h2>Quiz Complete!</h2>
          <p className="completion-text">
            You answered all {quizCards.length} questions from {deck?.name || 'this theme'}.
          </p>
          <div className="session-stats">
            <div className="session-stat correct">
              <h3>Correct</h3>
              <p>{sessionStats.correct}</p>
              <span>{getPercentage(sessionStats.correct)}%</span>
            </div>
            <div className="session-stat partial">
              <h3>Partially Correct</h3>
              <p>{sessionStats.partial}</p>
              <span>{getPercentage(sessionStats.partial)}%</span>
            </div>
            <div className="session-stat incorrect">
              <h3>Incorrect</h3>
              <p>{sessionStats.incorrect}</p>
              <span>{getPercentage(sessionStats.incorrect)}%</span>
            </div>
          </div>
          <div className="completion-actions">
            <button className="btn-primary" onClick={() => startSession(deckId)}>Quiz Again</button>
            <button className="btn-secondary" onClick={handleFinish}>Choose Theme</button>
          </div>
        </div>
      </div>
    );
  }

  if (!currentCard) {
    return <div className="ai-quiz-container"><p className="placeholder-text">Loading...</p></div>;
  }

  const verdictColor = result?.verdict === 'Correct' ? '#27ae60'
    : result?.verdict === 'Partially correct' ? '#f39c12' : '#e74c3c';

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
            <div className="quiz-buttons-row">
              <button className="btn-secondary" onClick={handleNext}>Next</button>
              <button className="btn-primary" onClick={handleCheck} disabled={loading}>
                {loading ? 'Checking...' : 'Check'}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="verdict-result">
              <div className="answers-comparison">
                <div className="answer-row correct">
                  <span className="answer-label">Correct:</span>
                  <span className="answer-text">{result.correctAnswer}</span>
                </div>
                <div className="answer-row user">
                  <span className="answer-label">Yours:</span>
                  <span className="answer-text">{lastUserAnswer}</span>
                </div>
              </div>
              <div className="verdict-badge" style={{ borderColor: verdictColor }}>
                <span className="verdict-text" style={{ color: verdictColor }}>
                  {result.verdict}
                </span>
              </div>
              <div className="verdict-comment">{result.comment}</div>
            </div>
            <button className="btn-primary" onClick={handleNext}>Next</button>
          </>
        )}
      </div>

      {/* Live Stats */}
      {(sessionStats.correct + sessionStats.partial + sessionStats.incorrect) > 0 && (
        <div className="live-stats">
          <h3>Session Stats</h3>
          <div className="live-stats-grid">
            <div className="live-stat correct">
              <span className="live-stat-label">Correct</span>
              <span className="live-stat-count">{sessionStats.correct}</span>
              <span className="live-stat-pct">{getPercentage(sessionStats.correct)}%</span>
            </div>
            <div className="live-stat partial">
              <span className="live-stat-label">Partial</span>
              <span className="live-stat-count">{sessionStats.partial}</span>
              <span className="live-stat-pct">{getPercentage(sessionStats.partial)}%</span>
            </div>
            <div className="live-stat incorrect">
              <span className="live-stat-label">Incorrect</span>
              <span className="live-stat-count">{sessionStats.incorrect}</span>
              <span className="live-stat-pct">{getPercentage(sessionStats.incorrect)}%</span>
            </div>
          </div>
          <div className="live-stats-bar">
            <div className="live-stat-bar-segment correct" style={{ width: `${getPercentage(sessionStats.correct)}%` }} />
            <div className="live-stat-bar-segment partial" style={{ width: `${getPercentage(sessionStats.partial)}%` }} />
            <div className="live-stat-bar-segment incorrect" style={{ width: `${getPercentage(sessionStats.incorrect)}%` }} />
          </div>
        </div>
      )}
    </div>
  );
}

export default AIQuizTab;
