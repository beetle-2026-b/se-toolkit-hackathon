from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime, date
from app.database import get_db
from app.models import Card, StudySession
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
    incorrect_today: int


class ScoredStudyStats(BaseModel):
    total_answered: int
    correct_count: int
    partial_count: int
    incorrect_count: int
    average_score: float


class SessionStats(BaseModel):
    total: int
    correct: int
    partial: int
    incorrect: int
    correct_pct: float
    partial_pct: float
    incorrect_pct: float


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
    query = db.query(Card)
    if deck_id is not None:
        query = query.filter(Card.deck_id == deck_id)

    total_cards = query.count()

    today_start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)

    session_query = db.query(StudySession).join(Card, StudySession.card_id == Card.id)
    if deck_id is not None:
        session_query = session_query.filter(Card.deck_id == deck_id)
    session_query = session_query.filter(StudySession.answered_at >= today_start)

    today_sessions = session_query.all()

    studied_today = len(today_sessions)
    correct_today = sum(1 for s in today_sessions if s.is_correct)
    incorrect_today = studied_today - correct_today

    return StudyStats(
        total_cards=total_cards,
        studied_today=studied_today,
        correct_today=correct_today,
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


@router.get("/study/progress")
def get_progress(db: Session = Depends(get_db), deck_id: Optional[int] = None):
    query = db.query(Card)
    if deck_id is not None:
        query = query.filter(Card.deck_id == deck_id)

    cards = query.all()

    box_distribution = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
    mastery_levels = {"New": 0, "Learning": 0, "Familiar": 0, "Proficient": 0, "Mastered": 0}

    for card in cards:
        box_distribution[card.box] = box_distribution.get(card.box, 0) + 1
        level = get_mastery_level(card.box)
        mastery_levels[level] = mastery_levels.get(level, 0) + 1

    total_cards = len(cards)
    mastered_count = box_distribution.get(5, 0)
    mastery_percentage = round((mastered_count / total_cards * 100), 1) if total_cards > 0 else 0

    return {
        "total_cards": total_cards,
        "box_distribution": box_distribution,
        "mastery_levels": mastery_levels,
        "mastery_percentage": mastery_percentage
    }
