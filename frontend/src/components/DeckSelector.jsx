import React, { useState } from 'react';
import { createDeck, updateDeck, deleteDeck } from '../services/api';

function DeckSelector({ decks, selectedDeckId, onSelectDeck, onDecksChange }) {
  const [showCreate, setShowCreate] = useState(false);
  const [newDeckName, setNewDeckName] = useState('');
  const [editingDeckId, setEditingDeckId] = useState(null);
  const [editName, setEditName] = useState('');
  const [error, setError] = useState('');

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');

    if (!newDeckName.trim()) return;

    try {
      const deck = await createDeck(newDeckName);
      onDecksChange();
      setNewDeckName('');
      setShowCreate(false);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleEditStart = (deck) => {
    setEditingDeckId(deck.id);
    setEditName(deck.name);
  };

  const handleEditSave = async () => {
    if (!editName.trim()) return;
    try {
      await updateDeck(editingDeckId, editName);
      setEditingDeckId(null);
      onDecksChange();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (deckId) => {
    if (!confirm('Delete this deck? Cards will be unassigned (not deleted).')) return;
    try {
      await deleteDeck(deckId);
      if (selectedDeckId === deckId) {
        onSelectDeck(null);
      }
      onDecksChange();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="deck-selector">
      <div className="deck-selector-header">
        <h3>Decks</h3>
        <button className="btn-small" onClick={() => setShowCreate(!showCreate)}>
          + New Deck
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {showCreate && (
        <form className="deck-create-form" onSubmit={handleCreate}>
          <input
            type="text"
            value={newDeckName}
            onChange={(e) => setNewDeckName(e.target.value)}
            placeholder="Deck name..."
            required
          />
          <button type="submit" className="btn-small btn-primary">Create</button>
        </form>
      )}

      <div className="deck-list">
        <div
          className={`deck-item ${selectedDeckId === null ? 'active' : ''}`}
          onClick={() => onSelectDeck(null)}
        >
          <span className="deck-name">All Decks</span>
        </div>

        {decks.map(deck => (
          <div key={deck.id} className="deck-item">
            {editingDeckId === deck.id ? (
              <div className="deck-edit">
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  autoFocus
                />
                <button className="btn-small" onClick={handleEditSave}>Save</button>
                <button className="btn-small" onClick={() => setEditingDeckId(null)}>Cancel</button>
              </div>
            ) : (
              <>
                <span
                  className={`deck-name ${selectedDeckId === deck.id ? 'active' : ''}`}
                  onClick={() => onSelectDeck(deck.id)}
                >
                  {deck.name}
                  <span className="deck-count">({deck.card_count})</span>
                </span>
                <div className="deck-actions">
                  <button className="btn-icon" onClick={() => handleEditStart(deck)} title="Edit">✏️</button>
                  <button className="btn-icon" onClick={() => handleDelete(deck.id)} title="Delete">🗑️</button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default DeckSelector;
