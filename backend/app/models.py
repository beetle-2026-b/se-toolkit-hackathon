from sqlalchemy import Column, Integer, String, Boolean, DateTime, Date, ForeignKey, Float, Text
from sqlalchemy.sql import func
from app.database import Base


class Deck(Base):
    __tablename__ = "decks"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    is_public = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Card(Base):
    __tablename__ = "cards"

    id = Column(Integer, primary_key=True, index=True)
    question = Column(String, nullable=False)
    answer = Column(String, nullable=False)
    deck_id = Column(Integer, ForeignKey("decks.id"), nullable=True)
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


class AIStudySession(Base):
    __tablename__ = "ai_study_sessions"

    id = Column(Integer, primary_key=True, index=True)
    card_id = Column(Integer, nullable=False)
    question = Column(String, nullable=False)
    correct_answer = Column(String, nullable=False)
    user_answer = Column(Text, nullable=False)
    verdict = Column(String, nullable=False)  # "Correct", "Partially correct", "Incorrect"
    comment = Column(Text, nullable=False)
    answered_at = Column(DateTime(timezone=True), server_default=func.now())
