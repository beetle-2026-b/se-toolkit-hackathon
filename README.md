# Smart Flashcards with AI

An intelligent flashcard system that automatically generates question-answer cards from lecture notes, evaluates free-text answers using AI semantic understanding, and optimizes learning through spaced repetition.

**End Users:** University students preparing for exams, self-learners mastering factual material, teaching assistants creating course decks.

**Problem Solved:** Students waste hours manually creating flashcards and struggle to evaluate their own open-ended answers. Traditional flashcard apps only support exact matching, failing to recognize correct answers phrased differently.

---

## Features

### Version 1 (Implemented)
- Create, edit, and delete flashcards manually
- Study mode with question reveal and self-rating
- Basic statistics dashboard (total cards, studied today, correct/incorrect counts)
- SQLite database persistence
- Clean, responsive web UI
- RESTful API with FastAPI backend

### Version 2 (Planned)
- AI card generation from any text (paste lecture notes → get 5-10 cards)
- AI answer evaluation (semantic correctness, not exact match)
- AI hint generation when stuck
- Leitner spaced repetition system (5 boxes with increasing intervals)
- Enhanced statistics dashboard (mastery level, daily streak, weak topics chart)
- Full Docker deployment

---

## Quick Start

### Without Docker

```bash
# Install dependencies
cd backend
pip install -r requirements.txt

# Run the server
cd app
uvicorn main:app --reload --port 8000

# Open browser
http://localhost:8000
```

### With Docker

```bash
# Copy environment file
cp .env.example .env

# Build and run
docker-compose up --build -d

# Access the application
http://localhost:8000
```

---

## Deployment on Ubuntu 24.04

### Prerequisites

```bash
sudo apt update
sudo apt install -y docker.io docker-compose git
sudo systemctl enable docker
sudo systemctl start docker
```

### Deploy

```bash
# Clone repository
git clone https://github.com/YOUR_USERNAME/smart-flashcards-ai.git
cd smart-flashcards-ai

# Configure environment
cp .env.example .env
# Edit .env to set your QWEN_API_URL (for Version 2)

# Build and run
docker-compose up --build -d

# Verify running
docker-compose ps

# Access web UI at http://YOUR_SERVER_IP:8000
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `QWEN_API_URL` | Qwen AI API endpoint (Version 2) | `http://localhost:8080/v1/chat/completions` |
| `DATABASE_PATH` | Path to SQLite database | `/app/data/flashcards.db` |
| `CORS_ORIGINS` | Allowed origins for CORS | `["http://localhost:8000"]` |

---

## API Endpoints

### Cards

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/cards` | Create a new card |
| GET | `/api/cards` | List all cards |
| GET | `/api/cards/{id}` | Get single card |
| PUT | `/api/cards/{id}` | Update card |
| DELETE | `/api/cards/{id}` | Delete card |

### Study

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/study/next` | Get next card to study |
| POST | `/api/study/rate` | Rate answer (correct/incorrect) |
| GET | `/api/study/stats` | Get study statistics |

### AI (Version 2)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/generate-cards` | Generate cards from text |
| POST | `/api/evaluate-answer` | Evaluate user's answer semantically |
| POST | `/api/generate-hint` | Generate hint for question |

---

## Project Structure

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

## Screenshots

> *[Placeholder: Card creation form]*

> *[Placeholder: Study mode with revealed answer]*

> *[Placeholder: Statistics dashboard]*

---

## Technology Stack

- **Backend:** Python FastAPI
- **Database:** SQLite with SQLAlchemy ORM
- **Frontend:** Vanilla HTML/CSS/JavaScript
- **AI Engine:** Qwen Code API (Version 2)
- **Deployment:** Docker Compose

---

## License

MIT License. See [LICENSE](LICENSE) for details.

---

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

---

## Support

For issues or questions, please open an issue on GitHub.
