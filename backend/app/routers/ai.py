from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from services.qwen_client import qwen_client

router = APIRouter()


class TextToCardsRequest(BaseModel):
    text: str


class CardResponse(BaseModel):
    question: str
    answer: str


class EvaluateAnswerRequest(BaseModel):
    question: str
    correct_answer: str
    user_answer: str


class EvaluateAnswerResponse(BaseModel):
    is_correct: bool
    confidence: float
    feedback: str


class GenerateHintRequest(BaseModel):
    question: str
    user_attempt: Optional[str] = ""


class GenerateHintResponse(BaseModel):
    hint: str


@router.post("/generate-cards", response_model=List[CardResponse])
async def generate_cards(request: TextToCardsRequest):
    if not request.text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty")
    
    if len(request.text) < 50:
        raise HTTPException(status_code=400, detail="Text is too short. Please provide at least 50 characters.")
    
    cards = await qwen_client.generate_cards(request.text)
    
    if not cards:
        raise HTTPException(status_code=500, detail="Failed to generate cards. Please check the AI service.")
    
    return cards


@router.post("/evaluate-answer", response_model=EvaluateAnswerResponse)
async def evaluate_answer(request: EvaluateAnswerRequest):
    if not request.question.strip() or not request.correct_answer.strip():
        raise HTTPException(status_code=400, detail="Question and correct answer are required")
    
    if not request.user_answer.strip():
        raise HTTPException(status_code=400, detail="User answer cannot be empty")
    
    result = await qwen_client.evaluate_answer(
        request.question,
        request.correct_answer,
        request.user_answer
    )
    
    return result


@router.post("/generate-hint", response_model=GenerateHintResponse)
async def generate_hint(request: GenerateHintRequest):
    if not request.question.strip():
        raise HTTPException(status_code=400, detail="Question is required")
    
    hint = await qwen_client.generate_hint(request.question, request.user_attempt)
    
    return GenerateHintResponse(hint=hint)
