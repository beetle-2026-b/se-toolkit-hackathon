const API_URL = '';

export async function getCards() {
  const res = await fetch(`${API_URL}/api/cards`);
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

export async function getNextStudyCard() {
  const res = await fetch(`${API_URL}/api/study/next`);
  if (!res.ok) throw new Error('Failed to load next card');
  return res.json();
}

export async function rateAnswer(cardId, isCorrect) {
  const res = await fetch(`${API_URL}/api/study/rate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ card_id: cardId, is_correct: isCorrect })
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail || 'Failed to rate answer');
  }
  return res.json();
}

export async function getStudyStats() {
  const res = await fetch(`${API_URL}/api/study/stats`);
  if (!res.ok) throw new Error('Failed to load stats');
  return res.json();
}

export async function getProgress() {
  const res = await fetch(`${API_URL}/api/study/progress`);
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
