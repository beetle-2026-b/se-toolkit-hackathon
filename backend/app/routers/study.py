from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime, date, timedelta
from database import get_db
from models import Card, StudySession

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
def get_next_card(db: Session = Depends(get_db)):
    today = date.today()
    
    due_cards = db.query(Card).filter(
        Card.next_review_date == None
    ).all()
    
    if not due_cards:
        due_cards = db.query(Card).filter(
            Card.next_review_date <= today
        ).all()
    
    if not due_cards:
        return {"message": "No cards due for review"}
    
    card = due_cards[0]
    return {
        "id": card.id,
        "question": card.question,
        "answer": card.answer,
        "box": card.box,
        "deck_id": card.deck_id
    }


@router.post("/study/rate")
def rate_answer(rating: RateAnswer, db: Session = Depends(get_db)):
    card = db.query(Card).filter(Card.id == rating.card_id).first()
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
    
    box_before = card.box
    
    if rating.is_correct:
        new_box = min(card.box + 1, 5)
        days_until_review = 2 ** (new_box - 1)
    else:
        new_box = 1
        days_until_review = 1
    
    card.box = new_box
    card.next_review_date = date.today() + timedelta(days=days_until_review)
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
        "next_review": card.next_review_date.isoformat()
    }


@router.get("/study/stats", response_model=StudyStats)
def get_study_stats(db: Session = Depends(get_db)):
    total_cards = db.query(Card).count()
    
    today_start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    
    today_sessions = db.query(StudySession).filter(
        StudySession.answered_at >= today_start
    ).all()
    
    studied_today = len(today_sessions)
    correct_today = sum(1 for s in today_sessions if s.is_correct)
    incorrect_today = studied_today - correct_today
    
    return StudyStats(
        total_cards=total_cards,
        studied_today=studied_today,
        correct_today=correct_today,
        incorrect_today=incorrect_today
    )
