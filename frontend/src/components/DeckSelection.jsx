import React, { useState } from 'react';
import { createDeck } from '../services/api';

function DeckSelection({ decks, onSelectDeck, onCreateSuccess, showCreate = true }) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newDeckName, setNewDeckName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newDeckName.trim()) return;

    setLoading(true);
    setError('');
    try {
      await createDeck(newDeckName);
      setNewDeckName('');
      setShowCreateForm(false);
      if (onCreateSuccess) onCreateSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (decks.length === 0) {
    return (
      <div className="deck-selection-empty">
        <p className="placeholder-text">There are no decks yet.</p>
        {showCreate && (
          <button className="btn-primary" onClick={() => setShowCreateForm(true)}>
            Create New Deck
          </button>
        )}
      </div>
    );
  }

  if (showCreateForm) {
    return (
      <div className="deck-create-modal">
        <h3>Create New Deck</h3>
        {error && <div className="error-message">{error}</div>}
        <form onSubmit={handleCreate}>
          <div className="form-group">
            <label htmlFor="new-deck-name">Deck Name</label>
            <input
              id="new-deck-name"
              type="text"
              value={newDeckName}
              onChange={(e) => setNewDeckName(e.target.value)}
              placeholder="Enter deck name..."
              required
              autoFocus
            />
          </div>
          <div className="create-actions">
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Creating...' : 'Create'}
            </button>
            <button type="button" className="btn-secondary" onClick={() => setShowCreate(false)}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="deck-selection">
      <div className="decks-grid">
        {decks.map(deck => (
          <button
            key={deck.id}
            className="deck-btn"
            onClick={() => onSelectDeck(deck.id)}
          >
            <span className="deck-name">{deck.name}</span>
            <span className="deck-count">{deck.card_count} {deck.card_count === 1 ? 'card' : 'cards'}</span>
          </button>
        ))}
      </div>
      <button className="btn-create-deck" onClick={() => setShowCreate(true)}>
        + Create New Deck
      </button>
    </div>
  );
}

export default DeckSelection;
