import React, { useState, useEffect } from 'react';
import { getNextStudyCard, rateAnswer, generateHint } from '../services/api';

function StudyTab({ deckId, onRatingComplete }) {
  const [studyCard, setStudyCard] = useState(null);
  const [message, setMessage] = useState('');
  const [revealed, setRevealed] = useState(false);
  const [hint, setHint] = useState('');
  const [loadingHint, setLoadingHint] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadNextCard();
  }, [deckId]);

  const loadNextCard = async () => {
    setError('');
    setRevealed(false);
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

  const handleReveal = () => {
    setRevealed(true);
  };

  const handleGetHint = async () => {
    if (!studyCard) return;
    setLoadingHint(true);
    try {
      const data = await generateHint(studyCard.question);
      setHint(data.hint);
    } catch (err) {
      setHint('Unable to generate hint. Please try again.');
    } finally {
      setLoadingHint(false);
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
            <>
              {hint && <div className="hint-box">{hint}</div>}
              <button
                className="btn-secondary"
                onClick={handleGetHint}
                disabled={loadingHint}
              >
                {loadingHint ? 'Loading...' : 'Get Hint'}
              </button>
              <button className="btn-primary" onClick={handleReveal}>
                Reveal Answer
              </button>
            </>
          ) : (
            <>
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
