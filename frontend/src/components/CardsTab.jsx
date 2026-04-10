import React, { useState } from 'react';
import { getCards, createCard, updateCard, deleteCard, generateAnswer, deleteDeck, getDecks } from '../services/api';
import DeckSelection from './DeckSelection';

function CardsTab({ decks, setDecks }) {
  const [phase, setPhase] = useState('select'); // 'select' | 'browsing'
  const [currentDeckId, setCurrentDeckId] = useState(null);
  const [cards, setCards] = useState([]);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [editingCardId, setEditingCardId] = useState(null);
  const [error, setError] = useState('');
  const [generatingAnswer, setGeneratingAnswer] = useState(false);

  const refreshDecks = async () => {
    try {
      const updatedDecks = await getDecks();
      setDecks(updatedDecks);
    } catch (err) {
      console.error('Failed to refresh decks:', err);
    }
  };

  const openDeck = async (deckId) => {
    setCurrentDeckId(deckId);
    setPhase('browsing');
    setEditingCardId(null);
    setQuestion('');
    setAnswer('');
    setError('');
    try {
      const cardsData = await getCards(deckId);
      setCards(cardsData);
    } catch (err) {
      setError('Failed to load cards.');
    }
  };

  const goBack = () => {
    setPhase('select');
    setCurrentDeckId(null);
    setCards([]);
    setQuestion('');
    setAnswer('');
    setEditingCardId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!question.trim() || !answer.trim()) return;

    try {
      if (editingCardId) {
        await updateCard(editingCardId, { question, answer, deck_id: currentDeckId });
        setEditingCardId(null);
      } else {
        await createCard({ question, answer, deck_id: currentDeckId });
      }
      setQuestion('');
      setAnswer('');
      const updatedCards = await getCards(currentDeckId);
      setCards(updatedCards);
      setDecks(prev => prev.map(d =>
        d.id === currentDeckId ? { ...d, card_count: updatedCards.length } : d
      ));
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
      const updatedCards = await getCards(currentDeckId);
      setCards(updatedCards);
      setDecks(prev => prev.map(d =>
        d.id === currentDeckId ? { ...d, card_count: updatedCards.length } : d
      ));
    } catch (err) {
      setError(err.message);
    }
  };

  const handleCancel = () => {
    setQuestion('');
    setAnswer('');
    setEditingCardId(null);
  };

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

  const handleDeleteDeck = async () => {
    if (!currentDeckId) return;
    const deck = decks.find(d => d.id === currentDeckId);
    if (!confirm(`Delete "${deck?.name}" and all ${cards.length} cards in it? This cannot be undone.`)) return;

    try {
      await deleteDeck(currentDeckId);
      setDecks(prev => prev.filter(d => d.id !== currentDeckId));
      goBack();
    } catch (err) {
      setError(err.message);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  const currentDeck = decks.find(d => d.id === currentDeckId);

  // Deck selection screen
  if (phase === 'select') {
    return (
      <div className="cards-container">
        <h2>My Cards</h2>
        <DeckSelection
          decks={decks}
          onSelectDeck={openDeck}
          onCreateSuccess={refreshDecks}
          showCreate={true}
        />
      </div>
    );
  }

  // Browsing cards in a deck
  return (
    <div className="cards-container">
      <div className="cards-header">
        <button className="btn-small" onClick={goBack}>← Back</button>
        <h2>{currentDeck?.name || 'Cards'}</h2>
        <span className="card-count-badge">{cards.length} cards</span>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="card-form-container">
        <h3>{editingCardId ? 'Edit Card' : 'Add New Card'}</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="question">Question</label>
            <textarea
              id="question"
              rows="2"
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
                rows="2"
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
                {generatingAnswer ? 'Generating...' : '✨ Generate'}
              </button>
            </div>
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
        {cards.length === 0 ? (
          <p className="placeholder-text">No cards yet. Add your first card above!</p>
        ) : (
          <div id="cards-container">
            {cards.map(card => (
              <div key={card.id} className="card-item">
                <div className="card-item-content">
                  <div className="question">{card.question}</div>
                  <div className="answer">{card.answer}</div>
                  <div className="meta">Box: {card.box} | Created: {formatDate(card.created_at)}</div>
                </div>
                <div className="card-actions">
                  <button className="edit-btn" onClick={() => handleEdit(card)}>Edit</button>
                  <button className="delete-btn" onClick={() => handleDelete(card.id)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {cards.length > 0 && (
          <div className="delete-deck-section">
            <button className="btn-delete-deck" onClick={handleDeleteDeck}>
              🗑️ Delete Deck "{currentDeck?.name}"
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default CardsTab;
