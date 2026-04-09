from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, field_validator
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from app.database import get_db
from app.models import Card, Deck

router = APIRouter()


class CardCreate(BaseModel):
    question: str
    answer: str
    deck_id: int  # Required - no unassigned cards


class CardUpdate(BaseModel):
    question: Optional[str] = None
    answer: Optional[str] = None
    deck_id: Optional[int] = None


class CardResponse(BaseModel):
    id: int
    question: str
    answer: str
    deck_id: Optional[int]
    box: int
    next_review_date: Optional[str]
    created_at: Optional[str]
    last_reviewed: Optional[str]

    @field_validator("next_review_date", "created_at", "last_reviewed", mode="before")
    @classmethod
    def convert_datetime(cls, v):
        if isinstance(v, datetime):
            return v.isoformat()
        if isinstance(v, str):
            return v
        return None

    class Config:
        from_attributes = True


@router.post("/cards", response_model=CardResponse, status_code=201)
def create_card(card: CardCreate, db: Session = Depends(get_db)):
    if not card.question.strip() or not card.answer.strip():
        raise HTTPException(status_code=400, detail="Question and answer cannot be empty")

    # Verify deck exists
    deck = db.query(Deck).filter(Deck.id == card.deck_id).first()
    if not deck:
        raise HTTPException(status_code=404, detail="Deck not found")

    db_card = Card(
        question=card.question,
        answer=card.answer,
        deck_id=card.deck_id
    )
    db.add(db_card)
    db.commit()
    db.refresh(db_card)
    return db_card


@router.get("/cards", response_model=List[CardResponse])
def get_cards(skip: int = 0, limit: int = 100, deck_id: Optional[int] = None, db: Session = Depends(get_db)):
    query = db.query(Card)
    if deck_id is not None:
        query = query.filter(Card.deck_id == deck_id)
    cards = query.offset(skip).limit(limit).all()
    return cards


@router.get("/cards/{card_id}", response_model=CardResponse)
def get_card(card_id: int, db: Session = Depends(get_db)):
    card = db.query(Card).filter(Card.id == card_id).first()
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
    return card


@router.put("/cards/{card_id}", response_model=CardResponse)
def update_card(card_id: int, card: CardUpdate, db: Session = Depends(get_db)):
    db_card = db.query(Card).filter(Card.id == card_id).first()
    if not db_card:
        raise HTTPException(status_code=404, detail="Card not found")
    
    if card.question is not None:
        if not card.question.strip():
            raise HTTPException(status_code=400, detail="Question cannot be empty")
        db_card.question = card.question
    
    if card.answer is not None:
        if not card.answer.strip():
            raise HTTPException(status_code=400, detail="Answer cannot be empty")
        db_card.answer = card.answer
    
    if card.deck_id is not None:
        db_card.deck_id = card.deck_id
    
    db.commit()
    db.refresh(db_card)
    return db_card


@router.delete("/cards/{card_id}", status_code=204)
def delete_card(card_id: int, db: Session = Depends(get_db)):
    db_card = db.query(Card).filter(Card.id == card_id).first()
    if not db_card:
        raise HTTPException(status_code=404, detail="Card not found")
    
    db.delete(db_card)
    db.commit()
    return None
