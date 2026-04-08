import React, { useState, useEffect } from 'react';
import { getNextStudyCard, rateAnswer, evaluateAnswer, generateHint } from '../services/api';

function StudyTab({ onRatingComplete }) {
  const [studyCard, setStudyCard] = useState(null);
  const [message, setMessage] = useState('');
  const [revealed, setRevealed] = useState(false);
  const [userAnswer, setUserAnswer] = useState('');
  const [aiFeedback, setAiFeedback] = useState('');
  const [hint, setHint] = useState('');
  const [loadingHint, setLoadingHint] = useState(false);
  const [loadingEvaluation, setLoadingEvaluation] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadNextCard();
  }, []);

  const loadNextCard = async () => {
    setError('');
    setRevealed(false);
    setUserAnswer('');
    setAiFeedback('');
    setHint('');

    try {
      const data = await getNextStudyCard();
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

  const handleReveal = () => {
    setRevealed(true);
  };

  const handleGetHint = async () => {
    if (!studyCard) return;
    setLoadingHint(true);
    try {
      const data = await generateHint(studyCard.question, userAnswer);
      setHint(data.hint);
    } catch (err) {
      setHint('Unable to generate hint. Please try again.');
    } finally {
      setLoadingHint(false);
    }
  };

  const handleEvaluate = async () => {
    if (!userAnswer.trim()) {
      alert('Please type your answer first.');
      return;
    }
    if (!studyCard) return;

    setLoadingEvaluation(true);
    try {
      const data = await evaluateAnswer(
        studyCard.question,
        studyCard.answer,
        userAnswer
      );
      const feedbackText = `Result: ${data.is_correct ? '✓ Correct' : '✗ Incorrect'} (Confidence: ${Math.round(data.confidence * 100)}%)\nFeedback: ${data.feedback}`;
      setAiFeedback(feedbackText);
    } catch (err) {
      setAiFeedback('Unable to evaluate answer. Please try again.');
    } finally {
      setLoadingEvaluation(false);
    }
  };

  const handleRate = async (isCorrect) => {
    if (!studyCard) return;
    try {
      await rateAnswer(studyCard.id, isCorrect);
      if (onRatingComplete) onRatingComplete();
      loadNextCard();
    } catch (err) {
      setError('Failed to record rating. Please try again.');
    }
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
            {revealed && (
              <div className="answer" id="study-answer">{studyCard.answer}</div>
            )}
          </>
        ) : (
          <p className="placeholder-text">Loading...</p>
        )}
      </div>

      {studyCard && (
        <div className="study-controls">
          {!revealed ? (
            <button className="btn-primary" onClick={handleReveal}>
              Reveal Answer
            </button>
          ) : (
            <>
              {hint && <div className="hint-box">{hint}</div>}
              <button
                className="btn-secondary"
                onClick={handleGetHint}
                disabled={loadingHint}
              >
                {loadingHint ? 'Loading...' : 'Get Hint'}
              </button>

              <div className="answer-evaluation">
                <textarea
                  rows="2"
                  value={userAnswer}
                  onChange={(e) => setUserAnswer(e.target.value)}
                  placeholder="Type your answer here (optional)..."
                />
                <button
                  className="btn-secondary"
                  onClick={handleEvaluate}
                  disabled={loadingEvaluation}
                >
                  {loadingEvaluation ? 'Evaluating...' : 'AI Evaluate'}
                </button>
                {aiFeedback && (
                  <div className="ai-feedback">{aiFeedback}</div>
                )}
              </div>

              <div className="manual-rating">
                <button className="btn-success" onClick={() => handleRate(true)}>
                  Correct
                </button>
                <button className="btn-danger" onClick={() => handleRate(false)}>
                  Incorrect
                </button>
              </div>

              <button className="btn-primary" onClick={loadNextCard}>
                Next Card
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default StudyTab;
