import React, { useState } from 'react';
import { getCards, createCard, updateCard, deleteCard, generateAnswer } from '../services/api';

function CardsTab({ cards, setCards, decks, selectedDeckId }) {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [deckId, setDeckId] = useState(selectedDeckId || '');
  const [editingCardId, setEditingCardId] = useState(null);
  const [error, setError] = useState('');
  const [generatingAnswer, setGeneratingAnswer] = useState(false);

  const handleGenerateAnswer = async () => {
    if (!question.trim()) {
      alert('Please type a question first.');
      return;
    }
    setGeneratingAnswer(true);
    setError('');
    try {
      const data = await generateAnswer(question);
      setAnswer(data.answer);
    } catch (err) {
      setError(err.message);
    } finally {
      setGeneratingAnswer(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!question.trim() || !answer.trim()) return;

    try {
      if (editingCardId) {
        await updateCard(editingCardId, { question, answer, deck_id: deckId || null });
        setEditingCardId(null);
      } else {
        await createCard({ question, answer, deck_id: deckId || null });
      }
      setQuestion('');
      setAnswer('');
      const updatedCards = await getCards();
      setCards(updatedCards);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleEdit = (card) => {
    setQuestion(card.question);
    setAnswer(card.answer);
    setEditingCardId(card.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (cardId) => {
    if (!confirm('Are you sure you want to delete this card?')) return;
    try {
      await deleteCard(cardId);
      const updatedCards = await getCards();
      setCards(updatedCards);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleCancel = () => {
    setQuestion('');
    setAnswer('');
    setEditingCardId(null);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  const getDeckName = (deckId) => {
    if (!deckId) return '';
    const deck = decks.find(d => d.id === deckId);
    return deck ? deck.name : '';
  };

  return (
    <div>
      <div className="card-form-container">
        <h2>{editingCardId ? 'Edit Card' : 'Create New Card'}</h2>
        {error && <div className="error-message">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="question">Question</label>
            <textarea
              id="question"
              rows="3"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              required
              placeholder="Enter your question..."
            />
          </div>
          <div className="form-group">
            <label htmlFor="answer">Answer</label>
            <div className="answer-field">
              <textarea
                id="answer"
                rows="3"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                required
                placeholder="Enter the answer or generate it with AI..."
              />
              <button
                type="button"
                className="btn-ai-generate"
                onClick={handleGenerateAnswer}
                disabled={generatingAnswer}
              >
                {generatingAnswer ? 'Generating...' : '✨ Generate Answer'}
              </button>
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="deck-select">Deck</label>
            <select
              id="deck-select"
              value={deckId}
              onChange={(e) => setDeckId(e.target.value)}
            >
              <option value="">No Deck (General)</option>
              {decks.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
          <div className="form-actions">
            <button type="submit" className="btn-primary">
              {editingCardId ? 'Update Card' : 'Add Card'}
            </button>
            {editingCardId && (
              <button type="button" className="btn-secondary" onClick={handleCancel}>
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="cards-list">
        <h2>All Cards ({cards.length})</h2>
        {cards.length === 0 ? (
          <p className="placeholder-text">No cards yet. Create your first card above!</p>
        ) : (
          <div id="cards-container">
            {cards.map(card => (
              <div key={card.id} className="card-item">
                <div className="card-item-content">
                  <div className="question">{card.question}</div>
                  <div className="answer">{card.answer}</div>
                  <div className="meta">
                    Box: {card.box} | Created: {formatDate(card.created_at)}
                    {getDeckName(card.deck_id) && (
                      <span className="deck-tag">{getDeckName(card.deck_id)}</span>
                    )}
                  </div>
                </div>
                <div className="card-actions">
                  <button className="edit-btn" onClick={() => handleEdit(card)}>Edit</button>
                  <button className="delete-btn" onClick={() => handleDelete(card.id)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default CardsTab;
