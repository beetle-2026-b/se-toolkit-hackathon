from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, field_validator
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from app.database import get_db
from app.models import Deck, Card

router = APIRouter()


class DeckCreate(BaseModel):
    name: str

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v):
        if not v.strip():
            raise ValueError("Deck name cannot be empty")
        if len(v) > 100:
            raise ValueError("Deck name must be less than 100 characters")
        return v.strip()


class DeckUpdate(BaseModel):
    name: Optional[str] = None

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v):
        if v is not None:
            if not v.strip():
                raise ValueError("Deck name cannot be empty")
            if len(v) > 100:
                raise ValueError("Deck name must be less than 100 characters")
            return v.strip()
        return v


class DeckResponse(BaseModel):
    id: int
    name: str
    is_public: bool
    created_at: Optional[str]
    card_count: int = 0

    @field_validator("created_at", mode="before")
    @classmethod
    def convert_datetime(cls, v):
        if isinstance(v, datetime):
            return v.isoformat()
        return None

    class Config:
        from_attributes = True


@router.post("/decks", response_model=DeckResponse, status_code=201)
def create_deck(deck: DeckCreate, db: Session = Depends(get_db)):
    db_deck = Deck(name=deck.name)
    db.add(db_deck)
    db.commit()
    db.refresh(db_deck)

    return DeckResponse(
        id=db_deck.id,
        name=db_deck.name,
        is_public=db_deck.is_public,
        created_at=db_deck.created_at,
        card_count=0
    )


@router.get("/decks", response_model=List[DeckResponse])
def get_decks(db: Session = Depends(get_db)):
    decks = db.query(Deck).all()

    result = []
    for deck in decks:
        card_count = db.query(Card).filter(Card.deck_id == deck.id).count()
        result.append(DeckResponse(
            id=deck.id,
            name=deck.name,
            is_public=deck.is_public,
            created_at=deck.created_at,
            card_count=card_count
        ))

    return result


@router.get("/decks/{deck_id}", response_model=DeckResponse)
def get_deck(deck_id: int, db: Session = Depends(get_db)):
    deck = db.query(Deck).filter(Deck.id == deck_id).first()
    if not deck:
        raise HTTPException(status_code=404, detail="Deck not found")

    card_count = db.query(Card).filter(Card.deck_id == deck.id).count()
    return DeckResponse(
        id=deck.id,
        name=deck.name,
        is_public=deck.is_public,
        created_at=deck.created_at,
        card_count=card_count
    )


@router.put("/decks/{deck_id}", response_model=DeckResponse)
def update_deck(deck_id: int, deck_update: DeckUpdate, db: Session = Depends(get_db)):
    deck = db.query(Deck).filter(Deck.id == deck_id).first()
    if not deck:
        raise HTTPException(status_code=404, detail="Deck not found")

    if deck_update.name is not None:
        deck.name = deck_update.name

    db.commit()
    db.refresh(deck)

    card_count = db.query(Card).filter(Card.deck_id == deck.id).count()
    return DeckResponse(
        id=deck.id,
        name=deck.name,
        is_public=deck.is_public,
        created_at=deck.created_at,
        card_count=card_count
    )


@router.delete("/decks/{deck_id}", status_code=204)
def delete_deck(deck_id: int, db: Session = Depends(get_db)):
    deck = db.query(Deck).filter(Deck.id == deck_id).first()
    if not deck:
        raise HTTPException(status_code=404, detail="Deck not found")

    # Unassign cards from this deck (don't delete them)
    db.query(Card).filter(Card.deck_id == deck_id).update({"deck_id": None})

    db.delete(deck)
    db.commit()
    return None


@router.get("/decks/{deck_id}/cards", response_model=List[dict])
def get_deck_cards(deck_id: int, db: Session = Depends(get_db)):
    deck = db.query(Deck).filter(Deck.id == deck_id).first()
    if not deck:
        raise HTTPException(status_code=404, detail="Deck not found")

    cards = db.query(Card).filter(Card.deck_id == deck_id).all()
    return [
        {
            "id": card.id,
            "question": card.question,
            "answer": card.answer,
            "deck_id": card.deck_id,
            "box": card.box,
            "next_review_date": card.next_review_date.isoformat() if card.next_review_date else None,
            "created_at": card.created_at.isoformat() if card.created_at else None,
            "last_reviewed": card.last_reviewed.isoformat() if card.last_reviewed else None,
        }
        for card in cards
    ]
