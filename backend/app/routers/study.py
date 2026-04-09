from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, date
from app.database import get_db
from app.models import Card, StudySession, AIStudySession, Deck
from app.services.spaced_repetition import calculate_next_review, get_box_info, get_mastery_level
from app.services.qwen_client import qwen_client

router = APIRouter()


class SelfRateRequest(BaseModel):
    card_id: int
    rating: str  # "correct", "partial", "incorrect"


class SelfRateResponse(BaseModel):
    card_id: int
    rating: str


class ScoreAnswerRequest(BaseModel):
    card_id: int
    user_answer: str


class ScoreAnswerResponse(BaseModel):
    score: int
    label: str
    comment: str


class StudyStats(BaseModel):
    total_cards: int
    studied_today: int
    correct_today: int
    partial_today: int
    incorrect_today: int


class ScoredStudyStats(BaseModel):
    total_answered: int
    correct_count: int
    partial_count: int
    incorrect_count: int
    average_score: float


@router.get("/study/next")
def get_next_card(db: Session = Depends(get_db), deck_id: Optional[int] = None):
    today = date.today()

    query = db.query(Card)
    if deck_id is not None:
        query = query.filter(Card.deck_id == deck_id)

    due_cards = query.filter(Card.next_review_date == None).all()

    if not due_cards:
        due_cards = query.filter(Card.next_review_date <= today).all()

    if not due_cards:
        return {"message": "No cards due for review"}

    card = due_cards[0]
    return {
        "id": card.id,
        "question": card.question,
        "answer": card.answer,
        "box": card.box,
        "box_info": get_box_info(card.box),
        "mastery_level": get_mastery_level(card.box),
        "deck_id": card.deck_id
    }


@router.post("/study/self-rate", response_model=SelfRateResponse)
def self_rate_answer(request: SelfRateRequest, db: Session = Depends(get_db)):
    if request.rating not in ("correct", "partial", "incorrect"):
        raise HTTPException(status_code=400, detail="Rating must be correct, partial, or incorrect")

    card = db.query(Card).filter(Card.id == request.card_id).first()
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")

    is_correct = request.rating in ("correct", "partial")
    box_before = card.box
    new_box, next_review = calculate_next_review(card.box, is_correct)

    card.box = new_box
    card.next_review_date = next_review
    card.last_reviewed = datetime.now()

    session = StudySession(
        card_id=card.id,
        is_correct=is_correct,
        rating=request.rating,
        box_before=box_before,
        box_after=new_box
    )
    db.add(session)
    db.commit()

    return SelfRateResponse(card_id=card.id, rating=request.rating)


@router.post("/study/score", response_model=ScoreAnswerResponse)
async def score_answer(request: ScoreAnswerRequest, db: Session = Depends(get_db)):
    if not request.user_answer.strip():
        raise HTTPException(status_code=400, detail="Answer cannot be empty")

    card = db.query(Card).filter(Card.id == request.card_id).first()
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")

    result = await qwen_client.score_answer(
        card.question,
        card.answer,
        request.user_answer
    )

    return ScoreAnswerResponse(
        score=result.score,
        label=result.label,
        comment=result.comment
    )


@router.get("/study/stats", response_model=StudyStats)
def get_study_stats(db: Session = Depends(get_db), deck_id: Optional[int] = None):
    total_cards = db.query(Card).count()

    today_start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    today_sessions = db.query(StudySession).filter(StudySession.answered_at >= today_start).all()

    studied_today = len(set(s.card_id for s in today_sessions))

    last_session_per_card = {}
    for s in today_sessions:
        last_session_per_card[s.card_id] = s

    correct_today = sum(1 for s in last_session_per_card.values() if s.rating == "correct")
    partial_today = sum(1 for s in last_session_per_card.values() if s.rating == "partial")
    incorrect_today = sum(1 for s in last_session_per_card.values() if s.rating == "incorrect")

    return StudyStats(
        total_cards=total_cards,
        studied_today=studied_today,
        correct_today=correct_today,
        partial_today=partial_today,
        incorrect_today=incorrect_today
    )


@router.get("/study/scored-stats", response_model=ScoredStudyStats)
def get_scored_study_stats(db: Session = Depends(get_db)):
    sessions = db.query(StudySession).all()

    total = len(sessions)
    if total == 0:
        return ScoredStudyStats(
            total_answered=0,
            correct_count=0,
            partial_count=0,
            incorrect_count=0,
            average_score=0.0
        )

    scores = []
    correct_count = 0
    partial_count = 0
    incorrect_count = 0

    for s in sessions:
        if s.box_after >= 4:
            score = 9
            correct_count += 1
        elif s.box_after == 2 or s.box_after == 3:
            score = 6
            partial_count += 1
        else:
            score = 2
            incorrect_count += 1
        scores.append(score)

    avg_score = round(sum(scores) / len(scores), 1) if scores else 0.0

    return ScoredStudyStats(
        total_answered=total,
        correct_count=correct_count,
        partial_count=partial_count,
        incorrect_count=incorrect_count,
        average_score=avg_score
    )


@router.post("/study/clear-today")
def clear_today_stats(db: Session = Depends(get_db)):
    today_start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    db.query(StudySession).filter(StudySession.answered_at >= today_start).delete()
    db.commit()
    return {"message": "Today's progress cleared"}


@router.post("/study/clear-all")
def clear_all_stats(db: Session = Depends(get_db)):
    db.query(StudySession).delete()
    db.query(Card).update({"box": 1, "next_review_date": None, "last_reviewed": None})
    db.commit()
    return {"message": "All progress cleared"}
