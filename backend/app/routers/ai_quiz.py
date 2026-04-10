from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from app.database import get_db
from app.models import Card, AIStudySession, User
from app.routers.auth import require_user
from app.services.qwen_client import qwen_client

router = APIRouter()


class QuizCheckRequest(BaseModel):
    card_id: int
    user_answer: str


class QuizCheckResponse(BaseModel):
    verdict: str
    comment: str


class QuizStats(BaseModel):
    total_answered: int
    correct_count: int
    partial_count: int
    incorrect_count: int


@router.get("/ai-quiz/next")
def get_next_quiz_card(db: Session = Depends(get_db), deck_id: Optional[int] = None, current_user: User = Depends(require_user)):
    query = db.query(Card).filter(Card.user_id == current_user.id)
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
async def check_answer(request: QuizCheckRequest, db: Session = Depends(get_db), current_user: User = Depends(require_user)):
    if not request.user_answer.strip():
        raise HTTPException(status_code=400, detail="Answer cannot be empty")

    card = db.query(Card).filter(Card.id == request.card_id, Card.user_id == current_user.id).first()
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")

    result = await qwen_client.evaluate_quiz_verdict(
        card.question,
        card.answer,
        request.user_answer
    )

    session = AIStudySession(
        card_id=card.id,
        user_id=current_user.id,
        question=card.question,
        correct_answer=card.answer,
        user_answer=request.user_answer,
        verdict=result.verdict,
        comment=result.comment
    )
    db.add(session)
    db.commit()

    return QuizCheckResponse(verdict=result.verdict, comment=result.comment)


@router.get("/ai-quiz/stats", response_model=QuizStats)
def get_quiz_stats(db: Session = Depends(get_db), current_user: User = Depends(require_user)):
    sessions = db.query(AIStudySession).filter(AIStudySession.user_id == current_user.id).all()

    total = len(sessions)
    if total == 0:
        return QuizStats(total_answered=0, correct_count=0, partial_count=0, incorrect_count=0)

    correct_count = sum(1 for s in sessions if s.verdict == "Correct")
    partial_count = sum(1 for s in sessions if s.verdict == "Partially correct")
    incorrect_count = sum(1 for s in sessions if s.verdict == "Incorrect")

    return QuizStats(
        total_answered=total,
        correct_count=correct_count,
        partial_count=partial_count,
        incorrect_count=incorrect_count
    )


@router.get("/ai-quiz/history", response_model=List[dict])
def get_quiz_history(limit: int = 20, db: Session = Depends(get_db), current_user: User = Depends(require_user)):
    sessions = db.query(AIStudySession).filter(
        AIStudySession.user_id == current_user.id
    ).order_by(AIStudySession.answered_at.desc()).limit(limit).all()

    result = []
    for s in sessions:
        result.append({
            "id": s.id,
            "card_id": s.card_id,
            "question": s.question,
            "correct_answer": s.correct_answer,
            "user_answer": s.user_answer,
            "verdict": s.verdict,
            "comment": s.comment,
            "answered_at": s.answered_at.isoformat() if s.answered_at else None
        })

    return result


@router.post("/ai-quiz/clear-today")
def clear_today_quiz_stats(db: Session = Depends(get_db), current_user: User = Depends(require_user)):
    today_start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    db.query(AIStudySession).filter(
        AIStudySession.user_id == current_user.id,
        AIStudySession.answered_at >= today_start
    ).delete()
    db.commit()
    return {"message": "Today's AI quiz progress cleared"}
