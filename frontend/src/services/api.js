const API_URL = '';

let authToken = localStorage.getItem('authToken');
let currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');

export function getToken() {
    return authToken;
}

export function getCurrentUser() {
    return currentUser;
}

export function setAuth(token, user) {
    authToken = token;
    currentUser = user;
    localStorage.setItem('authToken', token);
    localStorage.setItem('currentUser', JSON.stringify(user));
}

export function clearAuth() {
    authToken = null;
    currentUser = null;
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
}

export function isAuthenticated() {
    return !!authToken;
}

async function authFetch(url, options = {}) {
    const headers = {
        ...options.headers,
    };
    if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
    }
    if (!(options.body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
    }

    const res = await fetch(url, { ...options, headers });

    if (res.status === 401) {
        clearAuth();
        window.location.href = '/#/login';
    }

    return res;
}

export async function login(username, password) {
    const formData = new FormData();
    formData.append('username', username);
    formData.append('password', password);

    const res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        body: formData
    });

    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.detail || 'Login failed');
    }

    const data = await res.json();
    setAuth(data.access_token, { username: data.username });
    return data;
}

export async function register(username, password, confirmPassword) {
    const res = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            username,
            password,
            confirm_password: confirmPassword
        })
    });

    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.detail || 'Registration failed');
    }

    const data = await res.json();
    setAuth(data.access_token, { username: data.username });
    return data;
}

export function logout() {
    clearAuth();
    window.location.href = '/#/login';
}

// ============ DECKS ============

export async function getDecks() {
    const res = await authFetch(`${API_URL}/api/decks`);
    if (!res.ok) throw new Error('Failed to load decks');
    return res.json();
}

export async function createDeck(name) {
    const res = await authFetch(`${API_URL}/api/decks`, {
        method: 'POST',
        body: JSON.stringify({ name })
    });
    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.detail || 'Failed to create deck');
    }
    return res.json();
}

export async function updateDeck(deckId, name) {
    const res = await authFetch(`${API_URL}/api/decks/${deckId}`, {
        method: 'PUT',
        body: JSON.stringify({ name })
    });
    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.detail || 'Failed to update deck');
    }
    return res.json();
}

export async function deleteDeck(deckId) {
    const res = await authFetch(`${API_URL}/api/decks/${deckId}`, {
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
    const res = await authFetch(url);
    if (!res.ok) throw new Error('Failed to load cards');
    return res.json();
}

export async function createCard(cardData) {
    const res = await authFetch(`${API_URL}/api/cards`, {
        method: 'POST',
        body: JSON.stringify(cardData)
    });
    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.detail || 'Failed to create card');
    }
    return res.json();
}

export async function updateCard(cardId, cardData) {
    const res = await authFetch(`${API_URL}/api/cards/${cardId}`, {
        method: 'PUT',
        body: JSON.stringify(cardData)
    });
    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.detail || 'Failed to update card');
    }
    return res.json();
}

export async function deleteCard(cardId) {
    const res = await authFetch(`${API_URL}/api/cards/${cardId}`, {
        method: 'DELETE'
    });
    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.detail || 'Failed to delete card');
    }
}

export async function selfRateAnswer(cardId, rating) {
    const res = await authFetch(`${API_URL}/api/study/self-rate`, {
        method: 'POST',
        body: JSON.stringify({ card_id: cardId, rating })
    });
    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.detail || 'Failed to rate answer');
    }
    return res.json();
}

export async function rateAnswer(cardId, isCorrect) {
    const res = await authFetch(`${API_URL}/api/study/rate`, {
        method: 'POST',
        body: JSON.stringify({ card_id: cardId, is_correct: isCorrect })
    });
    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.detail || 'Failed to rate answer');
    }
    return res.json();
}

export async function getStudyStats(deckId = null) {
    const url = deckId !== null
        ? `${API_URL}/api/study/stats?deck_id=${deckId}`
        : `${API_URL}/api/study/stats`;
    const res = await authFetch(url);
    if (!res.ok) throw new Error('Failed to load stats');
    return res.json();
}

export async function getScoredStudyStats() {
    const res = await authFetch(`${API_URL}/api/study/scored-stats`);
    if (!res.ok) throw new Error('Failed to load scored stats');
    return res.json();
}

export async function getProgress(deckId = null) {
    const url = deckId !== null
        ? `${API_URL}/api/study/progress?deck_id=${deckId}`
        : `${API_URL}/api/study/progress`;
    const res = await authFetch(url);
    if (!res.ok) throw new Error('Failed to load progress');
    return res.json();
}

// ============ AI ============

export async function generateCardsFromText(text) {
    const res = await authFetch(`${API_URL}/api/generate-cards`, {
        method: 'POST',
        body: JSON.stringify({ text })
    });
    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.detail || 'Failed to generate cards');
    }
    return res.json();
}

export async function uploadPDF(file) {
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch(`${API_URL}/api/upload-pdf`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${authToken}` },
        body: formData
    });
    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.detail || 'Failed to process PDF');
    }
    return res.json();
}

export async function generateDeckName(text) {
    const res = await authFetch(`${API_URL}/api/generate-deck-name`, {
        method: 'POST',
        body: JSON.stringify({ text })
    });
    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.detail || 'Failed to generate deck name');
    }
    return res.json();
}

export async function generateAnswer(question) {
    const res = await authFetch(`${API_URL}/api/generate-answer`, {
        method: 'POST',
        body: JSON.stringify({ question })
    });
    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.detail || 'Failed to generate answer');
    }
    return res.json();
}

export async function scoreAnswer(cardId, userAnswer) {
    const res = await authFetch(`${API_URL}/api/study/score`, {
        method: 'POST',
        body: JSON.stringify({ card_id: cardId, user_answer: userAnswer })
    });
    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.detail || 'Failed to score answer');
    }
    return res.json();
}

// ============ STUDY MODE ============

export async function getNextStudyCard(deckId = null) {
    const url = deckId !== null
        ? `${API_URL}/api/study/next?deck_id=${deckId}`
        : `${API_URL}/api/study/next`;
    const res = await authFetch(url);
    if (!res.ok) throw new Error('Failed to load next card');
    return res.json();
}

export async function generateHint(question, userAttempt = '') {
    const res = await authFetch(`${API_URL}/api/generate-hint`, {
        method: 'POST',
        body: JSON.stringify({ question, user_attempt: userAttempt })
    });
    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.detail || 'Failed to generate hint');
    }
    return res.json();
}

// ============ AI QUIZ ============

export async function getNextQuizCard(deckId = null) {
    const url = deckId !== null
        ? `${API_URL}/api/ai-quiz/next?deck_id=${deckId}`
        : `${API_URL}/api/ai-quiz/next`;
    const res = await authFetch(url);
    if (!res.ok) throw new Error('Failed to load next quiz card');
    return res.json();
}

export async function checkQuizAnswer(cardId, userAnswer) {
    const res = await authFetch(`${API_URL}/api/ai-quiz/check`, {
        method: 'POST',
        body: JSON.stringify({ card_id: cardId, user_answer: userAnswer })
    });
    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.detail || 'Failed to check answer');
    }
    return res.json();
}

export async function getQuizStats() {
    const res = await authFetch(`${API_URL}/api/ai-quiz/stats`);
    if (!res.ok) throw new Error('Failed to load quiz stats');
    return res.json();
}
