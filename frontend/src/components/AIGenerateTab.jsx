import React, { useState } from 'react';
import { generateCardsFromText, createCard } from '../services/api';

function AIGenerateTab({ setCards }) {
  const [sourceText, setSourceText] = useState('');
  const [generatedCards, setGeneratedCards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGenerate = async (e) => {
    e.preventDefault();
    setError('');

    if (!sourceText.trim() || sourceText.length < 50) {
      setError('Please provide at least 50 characters of text.');
      return;
    }

    setLoading(true);
    try {
      const cards = await generateCardsFromText(sourceText);
      setGeneratedCards(cards);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAll = async () => {
    try {
      for (const card of generatedCards) {
        await createCard(card);
      }
      setGeneratedCards([]);
      setSourceText('');
      setError('');
      alert('All cards saved successfully!');
    } catch (err) {
      setError('Failed to save some cards. Please try again.');
    }
  };

  return (
    <div className="ai-generate-container">
      <h2>Generate Cards from Text</h2>
      <p className="subtitle">
        Paste lecture notes or any text content, and AI will generate flashcards for you.
      </p>
      {error && <div className="error-message">{error}</div>}
      <form onSubmit={handleGenerate}>
        <div className="form-group">
          <label htmlFor="source-text">Source Text</label>
          <textarea
            id="source-text"
            rows="10"
            value={sourceText}
            onChange={(e) => setSourceText(e.target.value)}
            required
            placeholder="Paste your lecture notes, textbook content, or study material here..."
          />
        </div>
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? 'Generating...' : 'Generate Cards'}
        </button>
      </form>

      {generatedCards.length > 0 && (
        <div className="generated-cards">
          <h3>Generated Cards ({generatedCards.length})</h3>
          <div className="generated-cards-list">
            {generatedCards.map((card, index) => (
              <div key={index} className="generated-card">
                <div className="question">{index + 1}. {card.question}</div>
                <div className="answer">{card.answer}</div>
              </div>
            ))}
          </div>
          <button className="btn-success" onClick={handleSaveAll}>
            Save All Cards
          </button>
        </div>
      )}
    </div>
  );
}

export default AIGenerateTab;
