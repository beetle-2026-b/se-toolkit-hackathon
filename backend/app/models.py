from sqlalchemy import Column, Integer, String, Boolean, DateTime, Date, ForeignKey
from sqlalchemy.sql import func
from database import Base


class Card(Base):
    __tablename__ = "cards"

    id = Column(Integer, primary_key=True, index=True)
    question = Column(String, nullable=False)
    answer = Column(String, nullable=False)
    deck_id = Column(Integer, nullable=True)
    box = Column(Integer, default=1)
    next_review_date = Column(Date, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    last_reviewed = Column(DateTime(timezone=True), nullable=True)


class StudySession(Base):
    __tablename__ = "study_sessions"

    id = Column(Integer, primary_key=True, index=True)
    card_id = Column(Integer, nullable=False)
    is_correct = Column(Boolean, nullable=True)
    answered_at = Column(DateTime(timezone=True), server_default=func.now())
    box_before = Column(Integer, nullable=True)
    box_after = Column(Integer, nullable=True)


class Deck(Base):
    __tablename__ = "decks"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    is_public = Column(Boolean, default=False)
    user_id = Column(String, nullable=True)
