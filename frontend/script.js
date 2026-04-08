const API_URL = window.location.origin;

let currentCardId = null;
let editingCardId = null;
let generatedCards = [];

document.addEventListener("DOMContentLoaded", () => {
    initTabs();
    initCardForm();
    initAIGenerate();
    initStudyMode();
    loadCards();
    loadProgress();
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

            if (btn.dataset.tab === "progress") {
                loadProgress();
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

function initAIGenerate() {
    const form = document.getElementById("ai-generate-form");
    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const text = document.getElementById("source-text").value.trim();
        if (!text) return;

        const btn = document.getElementById("generate-cards-btn");
        const btnText = btn.querySelector(".btn-text");
        const btnLoading = btn.querySelector(".btn-loading");

        btn.disabled = true;
        btnText.classList.add("hidden");
        btnLoading.classList.remove("hidden");

        try {
            const response = await fetch(`${API_URL}/api/generate-cards`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || "Failed to generate cards");
            }

            generatedCards = await response.json();
            renderGeneratedCards();
        } catch (error) {
            console.error("Error generating cards:", error);
            alert("Failed to generate cards. Please check the AI service and try again.");
        } finally {
            btn.disabled = false;
            btnText.classList.remove("hidden");
            btnLoading.classList.add("hidden");
        }
    });

    document.getElementById("save-generated-cards").addEventListener("click", saveGeneratedCards);
}

function renderGeneratedCards() {
    const container = document.getElementById("generated-cards-container");
    const list = document.getElementById("generated-cards-list");
    const countEl = document.getElementById("generated-count");
    const saveBtn = document.getElementById("save-generated-cards");

    countEl.textContent = generatedCards.length;
    
    list.innerHTML = generatedCards.map((card, index) => `
        <div class="generated-card">
            <div class="question">${index + 1}. ${escapeHtml(card.question)}</div>
            <div class="answer">${escapeHtml(card.answer)}</div>
        </div>
    `).join("");

    container.classList.remove("hidden");
    saveBtn.classList.remove("hidden");
}

async function saveGeneratedCards() {
    const saveBtn = document.getElementById("save-generated-cards");
    saveBtn.disabled = true;
    saveBtn.textContent = "Saving...";

    try {
        for (const card of generatedCards) {
            await createCard(card);
        }

        generatedCards = [];
        document.getElementById("generated-cards-container").classList.add("hidden");
        document.getElementById("source-text").value = "";
        loadCards();
        alert("All cards saved successfully!");
    } catch (error) {
        console.error("Error saving generated cards:", error);
        alert("Failed to save some cards. Please try again.");
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = "Save All Cards";
    }
}

function initStudyMode() {
    document.getElementById("reveal-btn").addEventListener("click", revealAnswer);
    document.getElementById("correct-btn").addEventListener("click", () => rateAnswer(true));
    document.getElementById("incorrect-btn").addEventListener("click", () => rateAnswer(false));
    document.getElementById("next-card-btn").addEventListener("click", loadNextStudyCard);
    document.getElementById("get-hint-btn").addEventListener("click", getHint);
    document.getElementById("evaluate-btn").addEventListener("click", evaluateAnswer);
}

async function loadNextStudyCard() {
    const studyCard = document.getElementById("study-card");
    const revealBtn = document.getElementById("reveal-btn");
    const ratingButtons = document.getElementById("rating-buttons");
    const hintContainer = document.getElementById("hint-container");
    const hintDisplay = document.getElementById("hint-display");
    const aiFeedback = document.getElementById("ai-feedback");
    const userAnswer = document.getElementById("user-answer");

    hintContainer.classList.add("hidden");
    hintDisplay.textContent = "";
    aiFeedback.classList.add("hidden");
    aiFeedback.textContent = "";
    userAnswer.value = "";

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
            <div class="meta">Box: ${data.box} | ${data.mastery_level}</div>
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
    const hintContainer = document.getElementById("hint-container");

    if (answerEl) {
        answerEl.classList.remove("hidden");
    }

    revealBtn.classList.add("hidden");
    ratingButtons.classList.remove("hidden");
    hintContainer.classList.remove("hidden");
}

async function getHint() {
    const hintDisplay = document.getElementById("hint-display");
    const hintBtn = document.getElementById("get-hint-btn");
    const questionEl = document.querySelector(".flashcard .question");
    
    if (!questionEl || !currentCardId) return;

    hintBtn.disabled = true;
    hintBtn.textContent = "Loading...";

    try {
        const response = await fetch(`${API_URL}/api/generate-hint`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                question: questionEl.textContent,
                user_attempt: ""
            })
        });

        if (!response.ok) throw new Error("Failed to generate hint");

        const data = await response.json();
        hintDisplay.textContent = data.hint;
    } catch (error) {
        console.error("Error generating hint:", error);
        hintDisplay.textContent = "Unable to generate hint. Please try again.";
    } finally {
        hintBtn.disabled = false;
        hintBtn.textContent = "Get Hint";
    }
}

async function evaluateAnswer() {
    const userAnswer = document.getElementById("user-answer").value.trim();
    const aiFeedback = document.getElementById("ai-feedback");
    const questionEl = document.querySelector(".flashcard .question");
    const answerEl = document.getElementById("study-answer");

    if (!userAnswer) {
        alert("Please type your answer first.");
        return;
    }

    if (!questionEl || !answerEl) return;

    aiFeedback.classList.remove("hidden");
    aiFeedback.textContent = "Evaluating...";

    try {
        const response = await fetch(`${API_URL}/api/evaluate-answer`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                question: questionEl.textContent,
                correct_answer: answerEl.textContent,
                user_answer: userAnswer
            })
        });

        if (!response.ok) throw new Error("Failed to evaluate answer");

        const data = await response.json();
        
        let feedbackText = `Result: ${data.is_correct ? "✓ Correct" : "✗ Incorrect"} (Confidence: ${Math.round(data.confidence * 100)}%)\n`;
        feedbackText += `Feedback: ${data.feedback}`;
        
        aiFeedback.textContent = feedbackText;
    } catch (error) {
        console.error("Error evaluating answer:", error);
        aiFeedback.textContent = "Unable to evaluate answer. Please try again.";
    }
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
        loadProgress();
    } catch (error) {
        console.error("Error rating answer:", error);
        alert("Failed to record your rating. Please try again.");
    }
}

async function loadProgress() {
    try {
        const [statsRes, progressRes] = await Promise.all([
            fetch(`${API_URL}/api/study/stats`),
            fetch(`${API_URL}/api/study/progress`)
        ]);

        if (!statsRes.ok || !progressRes.ok) throw new Error("Failed to load progress");

        const stats = await statsRes.json();
        const progress = await progressRes.json();

        document.getElementById("stat-total").textContent = stats.total_cards;
        document.getElementById("stat-studied").textContent = stats.studied_today;
        document.getElementById("stat-correct").textContent = stats.correct_today;
        document.getElementById("stat-incorrect").textContent = stats.incorrect_today;

        document.getElementById("mastery-percentage").textContent = `${progress.mastery_percentage}%`;
        document.getElementById("mastery-fill").style.width = `${progress.mastery_percentage}%`;

        renderBoxChart(progress.box_distribution);
    } catch (error) {
        console.error("Error loading progress:", error);
    }
}

function renderBoxChart(distribution) {
    const chart = document.getElementById("box-chart");
    const legend = document.getElementById("box-legend");
    
    const colors = ["#e74c3c", "#f39c12", "#f1c40f", "#3498db", "#27ae60"];
    const labels = ["Box 1 (New)", "Box 2 (Learning)", "Box 3 (Familiar)", "Box 4 (Proficient)", "Box 5 (Mastered)"];
    
    const total = Object.values(distribution).reduce((sum, val) => sum + val, 0);
    
    if (total === 0) {
        chart.innerHTML = '<p class="placeholder-text">No cards yet</p>';
        legend.innerHTML = '';
        return;
    }

    chart.innerHTML = Object.entries(distribution).map(([box, count], index) => {
        const width = (count / total * 100) || 1;
        return `<div class="box-segment" style="width: ${width}%; background: ${colors[index]}" title="${labels[index]}: ${count}"></div>`;
    }).join("");

    legend.innerHTML = labels.map((label, index) => `
        <div class="legend-item">
            <div class="legend-color" style="background: ${colors[index]}"></div>
            <span>${label}: ${distribution[index + 1]}</span>
        </div>
    `).join("");
}

document.getElementById("refresh-stats-btn").addEventListener("click", loadProgress);

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
