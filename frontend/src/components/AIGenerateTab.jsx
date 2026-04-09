import React, { useState } from 'react';
import { generateCardsFromText, uploadPDF, createDeck, createCard, generateDeckName, generateAnswer } from '../services/api';

function AIGenerateTab({ onDeckCreated }) {
  const [sourceText, setSourceText] = useState('');
  const [generatedCards, setGeneratedCards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pdfFile, setPdfFile] = useState(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [deckName, setDeckName] = useState('');
  const [saving, setSaving] = useState(false);
  const [sourceTextForName, setSourceTextForName] = useState('');
  const [nameLoading, setNameLoading] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [editQuestion, setEditQuestion] = useState('');
  const [editAnswer, setEditAnswer] = useState('');

  // Add card form
  const [showAddForm, setShowAddForm] = useState(false);
  const [newQuestion, setNewQuestion] = useState('');
  const [newAnswer, setNewAnswer] = useState('');
  const [generatingAnswer, setGeneratingAnswer] = useState(false);

  const handleGenerate = async (e) => {
    e.preventDefault();
    setError('');

    if (!sourceText.trim() || sourceText.length < 50) {
      setError('Please provide at least 50 characters of text.');
      return;
    }

    setLoading(true);
    setGeneratedCards([]);
    setDeckName('');
    setNameLoading(true);
    setEditingIndex(null);
    setShowAddForm(false);
    try {
      const cards = await generateCardsFromText(sourceText);
      setGeneratedCards(cards);
      setSourceTextForName(sourceText);

      try {
        const nameData = await generateDeckName(sourceText);
        setDeckName(nameData.name);
      } catch {
        setDeckName('Generated Cards');
      } finally {
        setNameLoading(false);
      }
    } catch (err) {
      setError(err.message);
      setNameLoading(false);
    } finally {
      setLoading(false);
    }
  };

  const handlePDFUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setPdfFile(file);
    setPdfLoading(true);
    setError('');
    setGeneratedCards([]);
    setDeckName('');
    setNameLoading(true);
    setEditingIndex(null);
    setShowAddForm(false);

    try {
      const cards = await uploadPDF(file);
      setGeneratedCards(cards);
      setSourceTextForName(file.name.replace('.pdf', ''));

      try {
        const nameData = await generateDeckName(file.name.replace('.pdf', ''));
        setDeckName(nameData.name);
      } catch {
        setDeckName(file.name.replace('.pdf', ''));
      } finally {
        setNameLoading(false);
      }
    } catch (err) {
      setError(err.message);
      setPdfFile(null);
      setNameLoading(false);
    } finally {
      setPdfLoading(false);
    }
  };

  const startEdit = (index) => {
    setEditingIndex(index);
    setEditQuestion(generatedCards[index].question);
    setEditAnswer(generatedCards[index].answer);
  };

  const cancelEdit = () => {
    setEditingIndex(null);
    setEditQuestion('');
    setEditAnswer('');
  };

  const saveEdit = () => {
    if (editingIndex === null) return;
    const updated = [...generatedCards];
    updated[editingIndex] = { question: editQuestion, answer: editAnswer };
    setGeneratedCards(updated);
    setEditingIndex(null);
  };

  const handleGenerateAnswer = async () => {
    if (!newQuestion.trim()) {
      alert('Please type a question first.');
      return;
    }
    setGeneratingAnswer(true);
    setError('');
    try {
      const data = await generateAnswer(newQuestion);
      setNewAnswer(data.answer);
    } catch (err) {
      setError(err.message);
    } finally {
      setGeneratingAnswer(false);
    }
  };

  const handleAddCard = () => {
    if (!newQuestion.trim() || !newAnswer.trim()) {
      alert('Please fill in both question and answer.');
      return;
    }
    setGeneratedCards(prev => [...prev, { question: newQuestion, answer: newAnswer }]);
    setNewQuestion('');
    setNewAnswer('');
    setShowAddForm(false);
  };

  const handleGenerateMore = async () => {
    if (!sourceTextForName) return;

    setLoading(true);
    setError('');
    try {
      const cards = await generateCardsFromText(sourceTextForName);
      // Append new cards, avoiding duplicates
      const existing = new Set(generatedCards.map(c => c.question.toLowerCase()));
      const newCards = cards.filter(c => !existing.has(c.question.toLowerCase()));
      setGeneratedCards(prev => [...prev, ...newCards]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAll = async () => {
    if (!deckName.trim()) {
      alert('Please enter a deck name.');
      return;
    }
    if (generatedCards.length === 0) {
      alert('No cards to save.');
      return;
    }

    setSaving(true);
    try {
      const deck = await createDeck(deckName);
      for (const card of generatedCards) {
        await createCard({ ...card, deck_id: deck.id });
      }
      const count = generatedCards.length;
      setGeneratedCards([]);
      setSourceText('');
      setPdfFile(null);
      setDeckName('');
      setSourceTextForName('');
      setError('');
      setShowAddForm(false);

      if (onDeckCreated) onDeckCreated();

      alert(`Deck "${deckName}" created with ${count} cards!`);
    } catch (err) {
      setError('Failed to save. ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="ai-generate-container">
      <h2>Generate Cards</h2>
      <p className="subtitle">Paste text or upload a PDF to generate flashcards with AI</p>
      {error && <div className="error-message">{error}</div>}

      {/* PDF Upload */}
      <div className="pdf-upload-section">
        <label htmlFor="pdf-upload" className="pdf-upload-label">
          {pdfLoading ? (
            <span>Processing PDF...</span>
          ) : pdfFile ? (
            <span>📄 {pdfFile.name}</span>
          ) : (
            <span>📁 Upload PDF File</span>
          )}
        </label>
        <input
          id="pdf-upload"
          type="file"
          accept=".pdf"
          onChange={handlePDFUpload}
          disabled={pdfLoading}
        />
        <p className="pdf-hint">AI will extract text from all pages and generate cards</p>
      </div>

      <div className="divider">
        <span>or paste text below</span>
      </div>

      {/* Text Input */}
      <form onSubmit={handleGenerate}>
        <div className="form-group">
          <label htmlFor="source-text">Source Text</label>
          <textarea
            id="source-text"
            rows="8"
            value={sourceText}
            onChange={(e) => setSourceText(e.target.value)}
            placeholder="Paste your lecture notes, textbook content, or study material here..."
          />
        </div>
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? 'Generating...' : 'Generate from Text'}
        </button>
      </form>

      {/* Generated Cards */}
      {generatedCards.length > 0 && (
        <div className="generated-cards">
          <h3>Generated Cards ({generatedCards.length})</h3>

          {/* Deck Name Input */}
          <div className="deck-name-section">
            <label htmlFor="deck-name">Deck Name</label>
            <input
              id="deck-name"
              type="text"
              value={deckName}
              onChange={(e) => setDeckName(e.target.value)}
              placeholder="Enter deck name..."
            />
            {nameLoading && <span className="deck-name-loading">Generating name...</span>}
          </div>

          <div className="generated-cards-list">
            {generatedCards.map((card, index) => (
              <div key={index} className="generated-card">
                {editingIndex === index ? (
                  <div className="card-edit-form">
                    <input
                      type="text"
                      value={editQuestion}
                      onChange={(e) => setEditQuestion(e.target.value)}
                      placeholder="Question"
                      className="edit-input"
                    />
                    <textarea
                      rows="2"
                      value={editAnswer}
                      onChange={(e) => setEditAnswer(e.target.value)}
                      placeholder="Answer"
                      className="edit-textarea"
                    />
                    <div className="edit-actions">
                      <button className="btn-small btn-success" onClick={saveEdit}>Save</button>
                      <button className="btn-small btn-secondary" onClick={cancelEdit}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div className="generated-card-row">
                    <div className="card-edit-content">
                      <div className="question">{index + 1}. {card.question}</div>
                      <div className="answer">{card.answer}</div>
                    </div>
                    <button className="edit-btn" onClick={() => startEdit(index)}>Edit</button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Add New Card Form */}
          {showAddForm && (
            <div className="add-card-form">
              <h4>Add New Card</h4>
              <div className="form-group">
                <label htmlFor="new-q">Question</label>
                <input
                  id="new-q"
                  type="text"
                  value={newQuestion}
                  onChange={(e) => setNewQuestion(e.target.value)}
                  placeholder="Enter question..."
                />
              </div>
              <div className="form-group">
                <label htmlFor="new-a">Answer</label>
                <div className="answer-field">
                  <textarea
                    id="new-a"
                    rows="2"
                    value={newAnswer}
                    onChange={(e) => setNewAnswer(e.target.value)}
                    placeholder="Enter answer or generate it..."
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
              <div className="add-card-actions">
                <button className="btn-small btn-success" onClick={handleAddCard}>Add Card</button>
                <button className="btn-small btn-secondary" onClick={() => setShowAddForm(false)}>Cancel</button>
              </div>
            </div>
          )}

          <div className="generate-actions">
            {!showAddForm && (
              <button className="btn-secondary" onClick={() => setShowAddForm(true)}>
                + Add New Card
              </button>
            )}
            <button className="btn-secondary" onClick={handleGenerateMore} disabled={loading || !sourceTextForName}>
              {loading ? 'Generating...' : '✨ Generate More Cards'}
            </button>
          </div>

          <button className="btn-success" onClick={handleSaveAll} disabled={saving || !deckName.trim()}>
            {saving ? 'Creating Deck & Saving...' : 'Save Cards to New Deck'}
          </button>
        </div>
      )}
    </div>
  );
}

export default AIGenerateTab;
