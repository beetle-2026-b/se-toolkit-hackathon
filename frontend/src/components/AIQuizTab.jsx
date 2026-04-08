import React, { useState, useEffect } from 'react';
import { getNextQuizCard, checkQuizAnswer, getQuizStats, getQuizHistory } from '../services/api';

function AIQuizTab({ deckId }) {
  const [quizCard, setQuizCard] = useState(null);
  const [message, setMessage] = useState('');
  const [userAnswer, setUserAnswer] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [stats, setStats] = useState(null);
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    loadQuizCard();
    loadStats();
  }, [deckId]);

  const loadQuizCard = async () => {
    setError('');
    setResult(null);
    setUserAnswer('');
    try {
      const data = await getNextQuizCard(deckId);
      if (data.message) {
        setMessage(data.message);
        setQuizCard(null);
      } else {
        setMessage('');
        setQuizCard(data);
      }
    } catch (err) {
      setError('Error loading quiz card. Please try again.');
    }
  };

  const loadStats = async () => {
    try {
      const statsData = await getQuizStats();
      setStats(statsData);
    } catch (err) {
      console.error('Error loading quiz stats:', err);
    }
  };

  const loadHistory = async () => {
    try {
      const historyData = await getQuizHistory(20);
      setHistory(historyData);
    } catch (err) {
      console.error('Error loading quiz history:', err);
    }
  };

  const handleCheck = async () => {
    if (!userAnswer.trim()) {
      alert('Please type your answer before checking.');
      return;
    }
    if (!quizCard) return;

    setLoading(true);
    setError('');
    try {
      const resultData = await checkQuizAnswer(quizCard.id, userAnswer);
      setResult(resultData);
      loadStats();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    loadQuizCard();
  };

  const toggleHistory = () => {
    if (!showHistory) {
      loadHistory();
    }
    setShowHistory(!showHistory);
  };

  return (
    <div className="ai-quiz-container">
      <h2>AI Quiz Mode</h2>
      <p className="subtitle">Type your answer and let AI evaluate it!</p>

      {stats && (
        <div className="ai-quiz-stats">
          <div className="quiz-stat">
            <h3>Answered</h3>
            <p>{stats.total_answered}</p>
          </div>
          <div className="quiz-stat">
            <h3>Accuracy</h3>
            <p className="text-success">{stats.accuracy}%</p>
          </div>
          <div className="quiz-stat">
            <h3>Avg Confidence</h3>
            <p>{stats.avg_confidence}%</p>
          </div>
          <div className="quiz-stat">
            <h3>Correct</h3>
            <p className="text-success">{stats.correct_count}</p>
          </div>
          <div className="quiz-stat">
            <h3>Incorrect</h3>
            <p className="text-danger">{stats.incorrect_count}</p>
          </div>
        </div>
      )}

      {error && <div className="error-message">{error}</div>}

      <div className="flashcard">
        {message ? (
          <p className="placeholder-text">{message}</p>
        ) : quizCard ? (
          <>
            <div className="question">{quizCard.question}</div>
          </>
        ) : (
          <p className="placeholder-text">Loading...</p>
        )}
      </div>

      {quizCard && (
        <div className="study-controls">
          {!result ? (
            <>
              <textarea
                rows="4"
                value={userAnswer}
                onChange={(e) => setUserAnswer(e.target.value)}
                placeholder="Type your answer here..."
                className="quiz-answer-textarea"
                disabled={loading}
              />
              <button
                className="btn-primary"
                onClick={handleCheck}
                disabled={loading}
              >
                {loading ? 'Checking...' : 'Check Answer'}
              </button>
            </>
          ) : (
            <>
              <div className="ai-quiz-result">
                <div className={`result-header ${result.is_correct ? 'correct' : 'incorrect'}`}>
                  {result.is_correct ? '✓ Correct' : '✗ Incorrect'}
                  <span className="confidence-badge">
                    Confidence: {Math.round(result.confidence * 100)}%
                  </span>
                </div>
                <div className="result-feedback">
                  <strong>AI Feedback:</strong>
                  <p>{result.feedback}</p>
                </div>
              </div>
              <div className="result-buttons">
                <button className="btn-primary" onClick={handleNext}>
                  Next Question
                </button>
              </div>
            </>
          )}

          <button className="btn-secondary" onClick={toggleHistory}>
            {showHistory ? 'Hide History' : 'Show History'}
          </button>
        </div>
      )}

      {showHistory && history.length > 0 && (
        <div className="quiz-history">
          <h3>Recent Quiz History ({history.length})</h3>
          <div className="history-list">
            {history.map(item => (
              <div key={item.id} className={`history-item ${item.is_correct ? 'correct' : 'incorrect'}`}>
                <div className="history-question">
                  <strong>{item.question}</strong>
                  <span className={`result-badge ${item.is_correct ? 'correct' : 'incorrect'}`}>
                    {item.is_correct ? '✓' : '✗'} {Math.round(item.confidence * 100)}%
                  </span>
                </div>
                <div className="history-answers">
                  <div className="history-user-answer">
                    <strong>Your Answer:</strong> {item.user_answer}
                  </div>
                  <div className="history-correct-answer">
                    <strong>Correct Answer:</strong> {item.correct_answer}
                  </div>
                </div>
                <div className="history-feedback">{item.feedback}</div>
                <div className="history-time">
                  {new Date(item.answered_at).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default AIQuizTab;
