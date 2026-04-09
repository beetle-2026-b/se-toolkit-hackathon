import React, { useState } from 'react';
import { generateCardsFromText, uploadPDF, createCard } from '../services/api';

function AIGenerateTab({ setCards }) {
  const [sourceText, setSourceText] = useState('');
  const [generatedCards, setGeneratedCards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pdfFile, setPdfFile] = useState(null);
  const [pdfLoading, setPdfLoading] = useState(false);

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

  const handlePDFUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setPdfFile(file);
    setPdfLoading(true);
    setError('');
    setGeneratedCards([]);

    try {
      const cards = await uploadPDF(file);
      setGeneratedCards(cards);
    } catch (err) {
      setError(err.message);
      setPdfFile(null);
    } finally {
      setPdfLoading(false);
    }
  };

  const handleSaveAll = async () => {
    try {
      for (const card of generatedCards) {
        await createCard(card);
      }
      setGeneratedCards([]);
      setSourceText('');
      setPdfFile(null);
      setError('');
      alert('All cards saved successfully!');
    } catch (err) {
      setError('Failed to save some cards. Please try again.');
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
