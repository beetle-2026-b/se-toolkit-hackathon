from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel
from typing import List, Optional
from io import BytesIO
from pypdf import PdfReader
from app.services.qwen_client import qwen_client

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


class GenerateAnswerRequest(BaseModel):
    question: str


class GenerateAnswerResponse(BaseModel):
    answer: str


@router.post("/generate-answer", response_model=GenerateAnswerResponse)
async def generate_answer(request: GenerateAnswerRequest):
    if not request.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty")

    answer = await qwen_client.generate_answer(request.question)

    if not answer:
        raise HTTPException(status_code=500, detail="Failed to generate answer. Please check the AI service.")

    return GenerateAnswerResponse(answer=answer)


@router.post("/upload-pdf", response_model=List[CardResponse])
async def upload_pdf(file: UploadFile = File(...)):
    if not file.filename or not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")

    try:
        content = await file.read()
        pdf_file = BytesIO(content)
        reader = PdfReader(pdf_file)

        text = ""
        for page in reader.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n"

        text = text.strip()

        if len(text) < 50:
            raise HTTPException(status_code=400, detail="PDF contains too little text. Please provide a file with more content.")

        cards = await qwen_client.generate_cards(text)

        if not cards:
            raise HTTPException(status_code=500, detail="Failed to generate cards from PDF. Please check the AI service.")

        return cards
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process PDF: {str(e)}")
