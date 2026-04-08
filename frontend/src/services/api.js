const API_URL = '';

// ============ DECKS ============

export async function getDecks() {
  const res = await fetch(`${API_URL}/api/decks`);
  if (!res.ok) throw new Error('Failed to load decks');
  return res.json();
}

export async function createDeck(name) {
  const res = await fetch(`${API_URL}/api/decks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name })
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail || 'Failed to create deck');
  }
  return res.json();
}

export async function updateDeck(deckId, name) {
  const res = await fetch(`${API_URL}/api/decks/${deckId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name })
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail || 'Failed to update deck');
  }
  return res.json();
}

export async function deleteDeck(deckId) {
  const res = await fetch(`${API_URL}/api/decks/${deckId}`, {
    method: 'DELETE'
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail || 'Failed to delete deck');
  }
}

// ============ CARDS ============

export async function getCards(deckId = null) {
  const url = deckId !== null
    ? `${API_URL}/api/cards?deck_id=${deckId}`
    : `${API_URL}/api/cards`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to load cards');
  return res.json();
}

export async function createCard(cardData) {
  const res = await fetch(`${API_URL}/api/cards`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cardData)
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail || 'Failed to create card');
  }
  return res.json();
}

export async function updateCard(cardId, cardData) {
  const res = await fetch(`${API_URL}/api/cards/${cardId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cardData)
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail || 'Failed to update card');
  }
  return res.json();
}

export async function deleteCard(cardId) {
  const res = await fetch(`${API_URL}/api/cards/${cardId}`, {
    method: 'DELETE'
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail || 'Failed to delete card');
  }
}

export async function getNextStudyCard(deckId = null) {
  const url = deckId !== null
    ? `${API_URL}/api/study/next?deck_id=${deckId}`
    : `${API_URL}/api/study/next`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to load next card');
  return res.json();
}

export async function scoreAnswer(cardId, userAnswer) {
  const res = await fetch(`${API_URL}/api/study/score`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ card_id: cardId, user_answer: userAnswer })
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail || 'Failed to score answer');
  }
  return res.json();
}

export async function getStudyStats(deckId = null) {
  const url = deckId !== null
    ? `${API_URL}/api/study/stats?deck_id=${deckId}`
    : `${API_URL}/api/study/stats`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to load stats');
  return res.json();
}

export async function getScoredStudyStats() {
  const res = await fetch(`${API_URL}/api/study/scored-stats`);
  if (!res.ok) throw new Error('Failed to load scored stats');
  return res.json();
}

export async function getProgress(deckId = null) {
  const url = deckId !== null
    ? `${API_URL}/api/study/progress?deck_id=${deckId}`
    : `${API_URL}/api/study/progress`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to load progress');
  return res.json();
}

export async function generateCardsFromText(text) {
  const res = await fetch(`${API_URL}/api/generate-cards`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text })
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail || 'Failed to generate cards');
  }
  return res.json();
}

export async function evaluateAnswer(question, correctAnswer, userAnswer) {
  const res = await fetch(`${API_URL}/api/evaluate-answer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      question,
      correct_answer: correctAnswer,
      user_answer: userAnswer
    })
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail || 'Failed to evaluate answer');
  }
  return res.json();
}

export async function generateHint(question, userAttempt = '') {
  const res = await fetch(`${API_URL}/api/generate-hint`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, user_attempt: userAttempt })
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail || 'Failed to generate hint');
  }
  return res.json();
}

// ============ AI QUIZ MODE ============

export async function getNextQuizCard(deckId = null) {
  const url = deckId !== null
    ? `${API_URL}/api/ai-quiz/next?deck_id=${deckId}`
    : `${API_URL}/api/ai-quiz/next`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to load next quiz card');
  return res.json();
}

export async function checkQuizAnswer(cardId, userAnswer) {
  const res = await fetch(`${API_URL}/api/ai-quiz/check`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ card_id: cardId, user_answer: userAnswer })
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail || 'Failed to check answer');
  }
  return res.json();
}

export async function getQuizStats() {
  const res = await fetch(`${API_URL}/api/ai-quiz/stats`);
  if (!res.ok) throw new Error('Failed to load quiz stats');
  return res.json();
}

export async function getQuizHistory(limit = 20) {
  const res = await fetch(`${API_URL}/api/ai-quiz/history?limit=${limit}`);
  if (!res.ok) throw new Error('Failed to load quiz history');
  return res.json();
}
