import React, { useState, useEffect } from 'react';
import { getNextStudyCard, scoreAnswer, generateHint } from '../services/api';

function StudyTab({ deckId }) {
  const [studyCard, setStudyCard] = useState(null);
  const [message, setMessage] = useState('');
  const [userAnswer, setUserAnswer] = useState('');
  const [result, setResult] = useState(null);
  const [hint, setHint] = useState('');
  const [loadingHint, setLoadingHint] = useState(false);
  const [loadingScore, setLoadingScore] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadNextCard();
  }, [deckId]);

  const loadNextCard = async () => {
    setError('');
    setResult(null);
    setUserAnswer('');
    setHint('');

    try {
      const data = await getNextStudyCard(deckId);
      if (data.message) {
        setMessage(data.message);
        setStudyCard(null);
      } else {
        setMessage('');
        setStudyCard(data);
      }
    } catch (err) {
      setError('Error loading card. Please try again.');
    }
  };

  const handleGetHint = async () => {
    if (!studyCard) return;
    setLoadingHint(true);
    try {
      const data = await generateHint(studyCard.question);
      setHint(data.hint);
    } catch (err) {
      setHint('Unable to generate hint.');
    } finally {
      setLoadingHint(false);
    }
  };

  const handleCheck = async () => {
    if (!userAnswer.trim()) {
      alert('Please type your answer before checking.');
      return;
    }
    if (!studyCard) return;

    setLoadingScore(true);
    setError('');
    try {
      const resultData = await scoreAnswer(studyCard.id, userAnswer);
      setResult(resultData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingScore(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 8) return '#27ae60';
    if (score >= 5) return '#f39c12';
    return '#e74c3c';
  };

  return (
    <div className="study-container">
      {error && <div className="error-message">{error}</div>}

      <div className="flashcard">
        {message ? (
          <p className="placeholder-text">{message}</p>
        ) : studyCard ? (
          <>
            <div className="question">{studyCard.question}</div>
            <div className="meta">
              Box: {studyCard.box} | {studyCard.mastery_level}
            </div>
            {result && (
              <div className="answer" id="study-answer">{studyCard.answer}</div>
            )}
          </>
        ) : (
          <p className="placeholder-text">Loading...</p>
        )}
      </div>

      {studyCard && (
        <div className="study-controls">
          {hint && <div className="hint-box">{hint}</div>}

          {!result && (
            <>
              <textarea
                rows="3"
                value={userAnswer}
                onChange={(e) => setUserAnswer(e.target.value)}
                placeholder="Type your answer here..."
                className="quiz-answer-textarea"
              />
              <button
                className="btn-secondary"
                onClick={handleGetHint}
                disabled={loadingHint}
              >
                {loadingHint ? 'Loading...' : 'Hint'}
              </button>
              <button
                className="btn-primary"
                onClick={handleCheck}
                disabled={loadingScore}
              >
                {loadingScore ? 'Checking...' : 'Check'}
              </button>
            </>
          )}

          {result && (
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
          )}

          <button className="btn-primary" onClick={loadNextCard}>
            Next
          </button>
        </div>
      )}
    </div>
  );
}

export default StudyTab;
