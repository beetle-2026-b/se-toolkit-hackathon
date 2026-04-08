from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from app.database import get_db
from app.models import Card, AIStudySession
from app.services.qwen_client import qwen_client

router = APIRouter()


class QuizCheckRequest(BaseModel):
    card_id: int
    user_answer: str


class QuizCheckResponse(BaseModel):
    is_correct: bool
    confidence: float
    feedback: str
    session_id: int


class QuizStatsResponse(BaseModel):
    total_answered: int
    correct_count: int
    incorrect_count: int
    accuracy: float
    avg_confidence: float


class QuizHistoryItem(BaseModel):
    id: int
    card_id: int
    question: str
    correct_answer: str
    user_answer: str
    is_correct: bool
    confidence: float
    feedback: str
    answered_at: Optional[str]

    class Config:
        from_attributes = True


@router.get("/ai-quiz/next")
def get_next_quiz_card(db: Session = Depends(get_db), deck_id: Optional[int] = None):
    query = db.query(Card)
    if deck_id is not None:
        query = query.filter(Card.deck_id == deck_id)
    cards = query.all()

    if not cards:
        return {"message": "No cards available for quiz"}

    import random
    card = random.choice(cards)

    return {
        "id": card.id,
        "question": card.question,
        "answer": card.answer,
        "deck_id": card.deck_id
    }


@router.post("/ai-quiz/check", response_model=QuizCheckResponse)
async def check_answer(request: QuizCheckRequest, db: Session = Depends(get_db)):
    if not request.user_answer.strip():
        raise HTTPException(status_code=400, detail="Answer cannot be empty")

    card = db.query(Card).filter(Card.id == request.card_id).first()
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")

    result = await qwen_client.evaluate_answer(
        card.question,
        card.answer,
        request.user_answer
    )

    session = AIStudySession(
        card_id=card.id,
        question=card.question,
        correct_answer=card.answer,
        user_answer=request.user_answer,
        is_correct=result.is_correct,
        confidence=result.confidence,
        feedback=result.feedback
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    return QuizCheckResponse(
        is_correct=result.is_correct,
        confidence=result.confidence,
        feedback=result.feedback,
        session_id=session.id
    )


@router.get("/ai-quiz/stats", response_model=QuizStatsResponse)
def get_quiz_stats(db: Session = Depends(get_db)):
    sessions = db.query(AIStudySession).all()

    total = len(sessions)
    if total == 0:
        return QuizStatsResponse(
            total_answered=0,
            correct_count=0,
            incorrect_count=0,
            accuracy=0.0,
            avg_confidence=0.0
        )

    correct_count = sum(1 for s in sessions if s.is_correct)
    incorrect_count = total - correct_count
    accuracy = round(correct_count / total * 100, 1)
    avg_confidence = round(sum(s.confidence for s in sessions) / total * 100, 1)

    return QuizStatsResponse(
        total_answered=total,
        correct_count=correct_count,
        incorrect_count=incorrect_count,
        accuracy=accuracy,
        avg_confidence=avg_confidence
    )


@router.get("/ai-quiz/history", response_model=List[dict])
def get_quiz_history(limit: int = 20, db: Session = Depends(get_db)):
    sessions = db.query(AIStudySession).order_by(
        AIStudySession.answered_at.desc()
    ).limit(limit).all()

    result = []
    for s in sessions:
        result.append({
            "id": s.id,
            "card_id": s.card_id,
            "question": s.question,
            "correct_answer": s.correct_answer,
            "user_answer": s.user_answer,
            "is_correct": s.is_correct,
            "confidence": s.confidence,
            "feedback": s.feedback,
            "answered_at": s.answered_at.isoformat() if s.answered_at else None
        })

    return result
