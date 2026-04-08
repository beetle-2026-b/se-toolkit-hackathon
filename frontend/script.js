const API_URL = window.location.origin;

let currentCardId = null;
let editingCardId = null;

document.addEventListener("DOMContentLoaded", () => {
    initTabs();
    initCardForm();
    initStudyMode();
    loadCards();
    loadStats();
});

function initTabs() {
    const navButtons = document.querySelectorAll(".nav-btn");
    navButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            navButtons.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");

            document.querySelectorAll(".tab-content").forEach(tab => {
                tab.classList.remove("active");
            });

            const tabId = btn.dataset.tab + "-tab";
            document.getElementById(tabId).classList.add("active");

            if (btn.dataset.tab === "stats") {
                loadStats();
            } else if (btn.dataset.tab === "study") {
                loadNextStudyCard();
            }
        });
    });
}

function initCardForm() {
    const form = document.getElementById("card-form");
    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const question = document.getElementById("question").value.trim();
        const answer = document.getElementById("answer").value.trim();

        if (!question || !answer) return;

        try {
            if (editingCardId) {
                await updateCard(editingCardId, { question, answer });
                editingCardId = null;
                form.querySelector('button[type="submit"]').textContent = "Add Card";
            } else {
                await createCard({ question, answer });
            }

            form.reset();
            loadCards();
        } catch (error) {
            console.error("Error saving card:", error);
            alert("Failed to save card. Please try again.");
        }
    });
}

async function createCard(cardData) {
    const response = await fetch(`${API_URL}/api/cards`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cardData)
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || "Failed to create card");
    }

    return response.json();
}

async function updateCard(cardId, cardData) {
    const response = await fetch(`${API_URL}/api/cards/${cardId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cardData)
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || "Failed to update card");
    }

    return response.json();
}

async function deleteCard(cardId) {
    if (!confirm("Are you sure you want to delete this card?")) return;

    try {
        const response = await fetch(`${API_URL}/api/cards/${cardId}`, {
            method: "DELETE"
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || "Failed to delete card");
        }

        loadCards();
    } catch (error) {
        console.error("Error deleting card:", error);
        alert("Failed to delete card. Please try again.");
    }
}

function editCard(cardId) {
    const cardsContainer = document.getElementById("cards-container");
    const cardElement = cardsContainer.querySelector(`[data-card-id="${cardId}"]`);
    
    if (!cardElement) return;

    const question = cardElement.querySelector(".question").textContent;
    const answer = cardElement.querySelector(".answer").textContent;

    document.getElementById("question").value = question;
    document.getElementById("answer").value = answer;
    document.getElementById("question").focus();

    editingCardId = cardId;
    document.querySelector('#card-form button[type="submit"]').textContent = "Update Card";
    window.scrollTo({ top: 0, behavior: "smooth" });
}

async function loadCards() {
    try {
        const response = await fetch(`${API_URL}/api/cards`);
        if (!response.ok) throw new Error("Failed to load cards");

        const cards = await response.json();
        renderCards(cards);
    } catch (error) {
        console.error("Error loading cards:", error);
    }
}

function renderCards(cards) {
    const container = document.getElementById("cards-container");
    const countElement = document.getElementById("card-count");
    
    countElement.textContent = cards.length;

    if (cards.length === 0) {
        container.innerHTML = '<p class="placeholder-text">No cards yet. Create your first card above!</p>';
        return;
    }

    container.innerHTML = cards.map(card => `
        <div class="card-item" data-card-id="${card.id}">
            <div class="card-item-content">
                <div class="question">${escapeHtml(card.question)}</div>
                <div class="answer">${escapeHtml(card.answer)}</div>
                <div class="meta">Box: ${card.box} | Created: ${formatDate(card.created_at)}</div>
            </div>
            <div class="card-actions">
                <button class="edit-btn" onclick="editCard(${card.id})">Edit</button>
                <button class="delete-btn" onclick="deleteCard(${card.id})">Delete</button>
            </div>
        </div>
    `).join("");
}

function initStudyMode() {
    document.getElementById("reveal-btn").addEventListener("click", revealAnswer);
    document.getElementById("correct-btn").addEventListener("click", () => rateAnswer(true));
    document.getElementById("incorrect-btn").addEventListener("click", () => rateAnswer(false));
    document.getElementById("next-card-btn").addEventListener("click", loadNextStudyCard);
}

async function loadNextStudyCard() {
    const studyCard = document.getElementById("study-card");
    const revealBtn = document.getElementById("reveal-btn");
    const ratingButtons = document.getElementById("rating-buttons");

    try {
        const response = await fetch(`${API_URL}/api/study/next`);
        if (!response.ok) throw new Error("Failed to load next card");

        const data = await response.json();

        if (data.message) {
            studyCard.innerHTML = `<p class="placeholder-text">${data.message}</p>`;
            revealBtn.disabled = true;
            return;
        }

        currentCardId = data.id;
        studyCard.innerHTML = `
            <div class="question">${escapeHtml(data.question)}</div>
            <div class="answer hidden" id="study-answer">${escapeHtml(data.answer)}</div>
        `;

        revealBtn.disabled = false;
        revealBtn.classList.remove("hidden");
        ratingButtons.classList.add("hidden");
    } catch (error) {
        console.error("Error loading study card:", error);
        studyCard.innerHTML = '<p class="placeholder-text">Error loading card. Please try again.</p>';
        revealBtn.disabled = true;
    }
}

function revealAnswer() {
    const answerEl = document.getElementById("study-answer");
    const revealBtn = document.getElementById("reveal-btn");
    const ratingButtons = document.getElementById("rating-buttons");

    if (answerEl) {
        answerEl.classList.remove("hidden");
    }

    revealBtn.classList.add("hidden");
    ratingButtons.classList.remove("hidden");
}

async function rateAnswer(isCorrect) {
    if (!currentCardId) return;

    try {
        const response = await fetch(`${API_URL}/api/study/rate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                card_id: currentCardId,
                is_correct: isCorrect
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || "Failed to rate answer");
        }

        loadNextStudyCard();
        loadStats();
    } catch (error) {
        console.error("Error rating answer:", error);
        alert("Failed to record your rating. Please try again.");
    }
}

async function loadStats() {
    try {
        const response = await fetch(`${API_URL}/api/study/stats`);
        if (!response.ok) throw new Error("Failed to load stats");

        const stats = await response.json();
        document.getElementById("stat-total").textContent = stats.total_cards;
        document.getElementById("stat-studied").textContent = stats.studied_today;
        document.getElementById("stat-correct").textContent = stats.correct_today;
        document.getElementById("stat-incorrect").textContent = stats.incorrect_today;
    } catch (error) {
        console.error("Error loading stats:", error);
    }
}

document.getElementById("refresh-stats-btn").addEventListener("click", loadStats);

function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(dateString) {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString();
}
