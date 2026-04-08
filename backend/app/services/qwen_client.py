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


class ScoredEvaluation(BaseModel):
    score: int  # 1-10
    label: str  # "Correct", "Partially correct", "Incorrect"
    comment: str  # brief explanation


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

Provide a short, helpful hint in exactly one sentence. Do NOT give the full answer — just a clue.

Return ONLY the hint, with no additional text."""

        response = await self._make_request([
            {"role": "system", "content": "You are a helpful tutor that provides one-sentence hints."},
            {"role": "user", "content": prompt}
        ])

        if not response:
            return "Unable to generate hint. Please try again."

        return response.strip()

    async def score_answer(self, question: str, correct_answer: str, user_answer: str) -> ScoredEvaluation:
        prompt = f"""You are scoring a student's answer. Here are the EXACT details:

=== QUESTION ===
{question}

=== REFERENCE ANSWER (the correct answer) ===
{correct_answer}

=== STUDENT'S ANSWER (what the student typed) ===
{user_answer}

=== EVALUATION RULES ===

Step 1 - Semantic meaning check: Does the student's answer mean the same thing as the reference answer? Consider:
- Synonyms, abbreviations, nicknames, acronyms (e.g., "cavs" = "Cavaliers" = "Cleveland Cavaliers")
- Different phrasings of the same fact (e.g., "rate of change" = "derivative")
- Common names vs formal names (e.g., "WW2" = "World War II")
- Shortened versions (e.g., "React" = "a JavaScript library for building user interfaces")

Step 2 - Fact-check: Using your knowledge, is the student's answer factually correct for THIS question?

Step 3 - Score:
- **10**: Perfect — exactly correct, same meaning as reference
- **8-9**: Correct — clearly right, may use different words but means the same thing
- **6-7**: Partially correct — has some right elements but incomplete
- **4-5**: Mostly wrong — mostly incorrect but has a small correct element
- **1-3**: Completely wrong — entirely incorrect
- **0**: No real answer (e.g., "I don't know", "idk")

CRITICAL: Score based on whether the student's answer is FACTUALLY CORRECT for the question. Do NOT give low scores just because wording differs from the reference.

Return ONLY valid JSON:
{{
  "score": 8,
  "label": "Correct",
  "comment": "Brief explanation."
}}"""

        response = await self._make_request([
            {"role": "system", "content": "You score student answers 1-10. You recognize synonyms, abbreviations, nicknames, and equivalent terms. You check if the student's answer is factually correct for the given question. Always return valid JSON."},
            {"role": "user", "content": prompt}
        ])

        if not response:
            return ScoredEvaluation(
                score=0,
                label="Evaluation failed",
                comment="AI service unavailable. Please try again."
            )

        try:
            response = response.strip()
            if response.startswith("```"):
                response = response.split("```")[1]
                if response.startswith("json"):
                    response = response[4:]
                response = response.strip()

            data = json.loads(response)
            score = int(data.get("score", 0))
            label = data.get("label", "")
            comment = data.get("comment", "")

            # Ensure score is in valid range
            if score < 1 or score > 10:
                return ScoredEvaluation(
                    score=0,
                    label="Evaluation failed",
                    comment="Could not evaluate answer. Please try again."
                )

            return ScoredEvaluation(
                score=score,
                label=label,
                comment=comment
            )
        except (json.JSONDecodeError, KeyError, TypeError, ValueError) as e:
            print(f"Failed to parse score response: {e}")
            return ScoredEvaluation(
                score=0,
                label="Evaluation failed",
                comment="Could not evaluate answer. Please try again."
            )

    async def generate_answer(self, question: str) -> str:
        prompt = f"""Generate a concise, factual answer to this question. Keep it short (1-2 sentences max). Be direct and clear.

Question: {question}

Return ONLY the answer, with no additional text, quotes, or formatting."""

        response = await self._make_request([
            {"role": "system", "content": "You are a knowledge assistant that provides short, direct answers to questions. Always return only the answer text."},
            {"role": "user", "content": prompt}
        ])

        if not response:
            return ""

        return response.strip()


qwen_client = QwenClient()
