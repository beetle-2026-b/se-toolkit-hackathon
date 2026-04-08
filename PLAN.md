# PLAN.md - Smart Flashcards with AI

## Overview
This document outlines the implementation plan for the Smart Flashcards with AI (SFA) project. The system is an intelligent flashcard application that automatically generates question-answer cards from lecture notes, evaluates free-text answers using AI semantic understanding, and optimizes learning through spaced repetition.

---

## Current Status: Not Started
**Next Action:** Set up the project structure and begin Version 1 implementation.

---

## Version 1: Core Flashcard System
**Status:** Not Started  
**Goal:** Working flashcard system with manual card creation, study mode, and SQLite persistence.

### Tasks

#### 1. Project Setup
- [ ] Create directory structure (`backend/`, `frontend/`, etc.)
- [ ] Initialize Python FastAPI project
- [ ] Set up `requirements.txt` with dependencies (fastapi, uvicorn, sqlalchemy, etc.)
- [ ] Create `.gitignore`
- [ ] Add `LICENSE` (MIT)

#### 2. Database Setup
- [ ] Create `backend/app/database.py` with SQLite connection
- [ ] Define `backend/app/models.py` with Card schema (id, question, answer, created_at, last_reviewed)
- [ ] Initialize database tables on startup

#### 3. Backend CRUD Endpoints
- [ ] Create `backend/app/routers/cards.py`
- [ ] Implement `POST /api/cards` - Create a new card
- [ ] Implement `GET /api/cards` - List all cards
- [ ] Implement `GET /api/cards/{id}` - Get single card
- [ ] Implement `PUT /api/cards/{id}` - Update card
- [ ] Implement `DELETE /api/cards/{id}` - Delete card
- [ ] Add input validation and error handling

#### 4. Frontend UI
- [ ] Create `frontend/index.html` with basic layout
- [ ] Create `frontend/style.css` for styling
- [ ] Create `frontend/script.js` for frontend logic
- [ ] Build card creation form (question + answer fields)
- [ ] Build card list display
- [ ] Implement edit/delete functionality in UI
- [ ] Connect frontend to backend API (fetch calls)

#### 5. Study Mode
- [ ] Create `backend/app/routers/study.py`
- [ ] Implement `GET /api/study/next` - Get next card to study
- [ ] Implement `POST /api/study/rate` - Rate answer (correct/incorrect)
- [ ] Build study mode UI (show question → reveal answer → rate)
- [ ] Display basic stats (total cards, studied today)

#### 6. Version 1 Testing
- [ ] Test create/edit/delete cards via UI
- [ ] Verify database persistence
- [ ] Test study mode flow
- [ ] Verify self-rating updates stats
- [ ] Check all endpoints return proper HTTP status codes

**Version 1 Deliverables:**
- Manual card CRUD via web UI
- Study mode with reveal and self-rating
- SQLite persistence
- Basic statistics display

---

## Version 2: AI-Powered Features
**Status:** Not Started (begins after Version 1 completion)  
**Goal:** AI card generation, semantic answer evaluation, Leitner spaced repetition, Docker deployment.

### Tasks

#### 1. Qwen API Integration
- [ ] Create `backend/app/services/qwen_client.py`
- [ ] Implement card generation prompt and parsing
- [ ] Implement answer evaluation logic (semantic correctness)
- [ ] Implement hint generation
- [ ] Add `backend/app/routers/ai.py` with endpoints:
  - `POST /api/generate-cards` - Generate cards from text
  - `POST /api/evaluate-answer` - Evaluate user's answer
  - `POST /api/generate-hint` - Generate hint for question
- [ ] Add error handling for AI failures

#### 2. Spaced Repetition System
- [ ] Create `backend/app/services/spaced_repetition.py`
- [ ] Implement Leitner algorithm (5 boxes with intervals: 1, 2, 4, 8, 16 days)
- [ ] Update `Card` model to include: `box`, `next_review_date`
- [ ] Add migration for existing database
- [ ] Create `study_sessions` table for tracking history

#### 3. Enhanced Statistics Dashboard
- [ ] Implement statistics calculation (mastery level, daily streak, weak topics)
- [ ] Build dashboard UI with charts/graphs
- [ ] Add progress indicators

#### 4. Frontend AI Features
- [ ] Add text input area for AI card generation
- [ ] Add free-text answer input in study mode
- [ ] Add hint button during study
- [ ] Display AI feedback after answer evaluation
- [ ] Show Leitner box status for each card

#### 5. Docker Deployment
- [ ] Create `backend/Dockerfile`
- [ ] Create `docker-compose.yml` (FastAPI + volume for SQLite)
- [ ] Create `.env.example` with QWEN_API_URL and other vars
- [ ] Test Docker build locally
- [ ] Verify containers communicate properly

#### 6. Production Deployment
- [ ] Document deployment steps in README
- [ ] Test on Ubuntu 24.04 server
- [ ] Verify web UI accessible at `http://SERVER_IP:8000`

#### 7. Version 2 Testing
- [ ] Test AI card generation (5-10 cards from sample text)
- [ ] Test semantic answer evaluation
- [ ] Test hint generation
- [ ] Verify Leitner scheduling logic
- [ ] Test Docker container restart with data persistence
- [ ] Test all edge cases (empty inputs, API failures, etc.)

**Version 2 Deliverables:**
- AI card generation from lecture notes
- AI semantic answer evaluation
- AI hint generation
- Leitner spaced repetition
- Statistics dashboard
- Docker deployment
- Complete README

---

## Release Strategy

### Phase 1: Foundation (Version 1)
Focus on building a solid core flashcard system with reliable CRUD operations and a functional study mode. This establishes the foundation for AI enhancements.

### Phase 2: Intelligence (Version 2)
Layer AI capabilities on top of the core system, adding automated card generation, intelligent answer evaluation, and spaced repetition optimization.

### Phase 3: Production (Deployment)
Package the application in Docker, deploy to production environment, and ensure reliability and scalability.

---

## File Structure
```
smart-flashcards-ai/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py
│   │   ├── models.py
│   │   ├── database.py
│   │   ├── routers/
│   │   │   ├── cards.py
│   │   │   ├── study.py
│   │   │   └── ai.py
│   │   └── services/
│   │       ├── qwen_client.py
│   │       └── spaced_repetition.py
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── index.html
│   ├── style.css
│   └── script.js
├── docker-compose.yml
├── .env.example
├── README.md
├── LICENSE
└── .gitignore
```

---

## Database Schema

### cards table
| Column | Type | Constraints |
|--------|------|-------------|
| id | INTEGER | PRIMARY KEY |
| question | TEXT | NOT NULL |
| answer | TEXT | NOT NULL |
| deck_id | INTEGER | |
| box | INTEGER | DEFAULT 1 (Leitner box 1-5) |
| next_review_date | DATE | |
| created_at | TIMESTAMP | |
| last_reviewed | TIMESTAMP | |

### study_sessions table
| Column | Type | Constraints |
|--------|------|-------------|
| id | INTEGER | PRIMARY KEY |
| card_id | INTEGER | |
| is_correct | BOOLEAN | |
| answered_at | TIMESTAMP | |
| box_before | INTEGER | |
| box_after | INTEGER | |

### decks table (optional)
| Column | Type | Constraints |
|--------|------|-------------|
| id | INTEGER | PRIMARY KEY |
| name | TEXT | |
| is_public | BOOLEAN | DEFAULT 0 |
| user_id | TEXT | |

---

## Leitner System Algorithm

**Box Intervals:**
- Box 1: Review daily (1 day)
- Box 2: Every 2 days
- Box 3: Every 4 days
- Box 4: Every 8 days
- Box 5: Every 16 days (mastered)

**Algorithm:**
```
On correct answer:
  new_box = min(current_box + 1, 5)
  next_review = today + (2^(new_box-1)) days

On incorrect answer:
  new_box = 1
  next_review = today + 1 day
```

---

## AI Integration Endpoints

### 1. Card Generation
```
POST /api/generate-cards
Request: {"text": "lecture notes content..."}
Response: {"cards": [{"question": "...", "answer": "..."}]}
```

### 2. Answer Evaluation
```
POST /api/evaluate-answer
Request: {
  "question": "What is X?",
  "correct_answer": "definition...",
  "user_answer": "student's response..."
}
Response: {"is_correct": true, "confidence": 0.85, "feedback": "..."}
```

### 3. Hint Generation
```
POST /api/generate-hint
Request: {"question": "...", "user_attempt": "..."}
Response: {"hint": "short clue..."}
```

---

## Deployment Plan (Ubuntu 24.04)

### Prerequisites
```bash
sudo apt update
sudo apt install -y docker.io docker-compose git
sudo systemctl enable docker
sudo systemctl start docker
```

### Deployment Steps
```bash
git clone https://github.com/YOUR_USERNAME/smart-flashcards-ai.git
cd smart-flashcards-ai
cp .env.example .env
# Edit .env to set QWEN_API_URL
docker-compose up --build -d
docker-compose ps
# Access at http://YOUR_SERVER_IP:8000
```

### Environment Variables (.env)
```
QWEN_API_URL=http://qwen-code-api:8080/v1/chat/completions
DATABASE_PATH=/app/data/flashcards.db
CORS_ORIGINS=["http://localhost:8000", "http://YOUR_SERVER_IP:8000"]
```

---

## Testing Checklist

### Version 1 Testing
- [ ] Create card via UI → appears in database
- [ ] Edit card → changes persist
- [ ] Delete card → removed from database
- [ ] Study mode shows question
- [ ] Click reveal shows answer
- [ ] Self-rating updates stats
- [ ] All endpoints return proper HTTP status codes

### Version 2 Testing
- [ ] Paste text → AI generates 5-10 valid cards
- [ ] Submit answer → AI correctly judges correctness
- [ ] Request hint → AI returns helpful clue
- [ ] Leitner algorithm schedules reviews correctly
- [ ] Dashboard shows accurate statistics
- [ ] Docker containers start and communicate
- [ ] Data persists after container restart

---

## Success Criteria

- [ ] Version 1: Core flashcard system fully functional
- [ ] Version 2: AI features integrated and working
- [ ] Application deployed and accessible via web browser
- [ ] Repository contains MIT license
- [ ] README.md includes complete documentation
- [ ] All code pushed to version control
- [ ] Docker containers run successfully on Ubuntu 24.04
- [ ] Data persists across container restarts

---

## Timeline

| Phase | Duration | Deliverables |
|-------|----------|--------------|
| Project Setup | 1-2 hours | Directory structure, dependencies, base configuration |
| Version 1 Development | 3-4 hours | CRUD endpoints, study mode, basic UI |
| Version 1 Testing | 1 hour | All core features tested and working |
| Version 2 Development | 2-3 days | AI integration, spaced repetition, dashboard |
| Version 2 Testing | 1 day | AI features, Docker, edge cases tested |
| Deployment & Documentation | 2-3 hours | Production deployment, README, presentation |

---

## Notes for Implementation

- **Git workflow:** Managed by developer (feature branches, merge to main)
- **Language:** English only (no Russian in code, comments, or docs)
- **AI API:** Uses Qwen Code API
- **Frontend:** Pure HTML/CSS/JS (no frameworks required)
- **Backend:** Python FastAPI with SQLite via SQLAlchemy
- **Deployment:** Docker Compose with persistent volume

---

*Last updated: Wednesday, April 8, 2026*
