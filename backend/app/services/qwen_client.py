import os
import json
import httpx
from typing import List, Dict, Optional
from pydantic import BaseModel


QWEN_API_URL = os.getenv("QWEN_API_URL", "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions")
QWEN_API_KEY = os.getenv("QWEN_API_KEY", "")
QWEN_MODEL = os.getenv("QWEN_MODEL", "qwen-plus")


class GeneratedCard(BaseModel):
    question: str
    answer: str


class EvaluationResult(BaseModel):
    is_correct: bool
    confidence: float
    feedback: str


class QwenClient:
    def __init__(self):
        self.api_url = QWEN_API_URL
        self.api_key = QWEN_API_KEY
        self.model = QWEN_MODEL
        self.timeout = 30.0

    async def _make_request(self, messages: List[Dict[str, str]]) -> Optional[str]:
        if not self.api_key:
            print("Warning: QWEN_API_KEY is not set")
            return None

        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    self.api_url,
                    json={
                        "model": self.model,
                        "messages": messages,
                        "temperature": 0.7,
                        "max_tokens": 2000
                    },
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json"
                    },
                    timeout=self.timeout
                )
                response.raise_for_status()
                data = response.json()
                return data["choices"][0]["message"]["content"]
        except Exception as e:
            print(f"Qwen API error: {e}")
            return None

    async def generate_cards(self, text: str) -> List[GeneratedCard]:
        prompt = f"""You are a flashcard generator. Based on the following text, create exactly 8 question-answer pairs that cover the key concepts.

Return ONLY valid JSON in this exact format, with no additional text:
{{
  "cards": [
    {{"question": "Your question here", "answer": "Your answer here"}},
    ...
  ]
}}

Text to generate cards from:
{text}"""

        response = await self._make_request([
            {"role": "system", "content": "You are a helpful assistant that generates flashcards from text. Always return valid JSON."},
            {"role": "user", "content": prompt}
        ])

        if not response:
            return []

        try:
            response = response.strip()
            if response.startswith("```"):
                response = response.split("```")[1]
                if response.startswith("json"):
                    response = response[4:]
                response = response.strip()

            data = json.loads(response)
            cards = data.get("cards", [])
            return [GeneratedCard(question=c["question"], answer=c["answer"]) for c in cards[:10]]
        except (json.JSONDecodeError, KeyError, TypeError) as e:
            print(f"Failed to parse Qwen response: {e}")
            return []

    async def evaluate_answer(self, question: str, correct_answer: str, user_answer: str) -> EvaluationResult:
        prompt = f"""You are evaluating a student's answer to a flashcard question.

Question: {question}
Correct Answer: {correct_answer}
Student's Answer: {user_answer}

Evaluate if the student's answer is semantically correct (not just exact match). Consider:
- Does it capture the key concept?
- Is it factually accurate?
- Is it relevant to the question?

Return ONLY valid JSON in this exact format:
{{
  "is_correct": true or false,
  "confidence": 0.0 to 1.0,
  "feedback": "Brief explanation of why the answer is correct or incorrect, and what could be improved."
}}"""

        response = await self._make_request([
            {"role": "system", "content": "You are an educational assistant that evaluates student answers. Always return valid JSON."},
            {"role": "user", "content": prompt}
        ])

        if not response:
            return EvaluationResult(
                is_correct=False,
                confidence=0.0,
                feedback="Unable to evaluate answer due to a technical error."
            )

        try:
            response = response.strip()
            if response.startswith("```"):
                response = response.split("```")[1]
                if response.startswith("json"):
                    response = response[4:]
                response = response.strip()

            data = json.loads(response)
            return EvaluationResult(
                is_correct=data.get("is_correct", False),
                confidence=float(data.get("confidence", 0.0)),
                feedback=data.get("feedback", "")
            )
        except (json.JSONDecodeError, KeyError, TypeError, ValueError) as e:
            print(f"Failed to parse Qwen evaluation response: {e}")
            return EvaluationResult(
                is_correct=False,
                confidence=0.0,
                feedback="Unable to evaluate answer. Please try again."
            )

    async def generate_hint(self, question: str, user_attempt: str = "") -> str:
        prompt = f"""You are helping a student who is stuck on a flashcard question.

Question: {question}
{f"Student's attempt so far: {user_attempt}" if user_attempt else "The student has not attempted an answer yet."}

Provide a short, helpful hint that guides them toward the answer without giving it away completely. Keep it to 1-2 sentences.

Return ONLY the hint, with no additional text or formatting."""

        response = await self._make_request([
            {"role": "system", "content": "You are a helpful tutor that provides short hints for students."},
            {"role": "user", "content": prompt}
        ])

        if not response:
            return "Unable to generate hint. Please try again."

        return response.strip()


qwen_client = QwenClient()
