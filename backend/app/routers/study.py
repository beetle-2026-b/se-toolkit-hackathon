from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime, date
from app.database import get_db
from app.models import Card, StudySession
from app.services.spaced_repetition import calculate_next_review, get_box_info, get_mastery_level

router = APIRouter()


class RateAnswer(BaseModel):
    card_id: int
    is_correct: bool


class StudyStats(BaseModel):
    total_cards: int
    studied_today: int
    correct_today: int
    incorrect_today: int


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


@router.post("/study/rate")
def rate_answer(rating: RateAnswer, db: Session = Depends(get_db)):
    card = db.query(Card).filter(Card.id == rating.card_id).first()
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")

    box_before = card.box
    new_box, next_review = calculate_next_review(card.box, rating.is_correct)

    card.box = new_box
    card.next_review_date = next_review
    card.last_reviewed = datetime.now()

    session = StudySession(
        card_id=card.id,
        is_correct=rating.is_correct,
        box_before=box_before,
        box_after=new_box
    )
    db.add(session)
    db.commit()

    return {
        "card_id": card.id,
        "box_before": box_before,
        "box_after": new_box,
        "mastery_level": get_mastery_level(new_box),
        "next_review": next_review.isoformat()
    }


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
