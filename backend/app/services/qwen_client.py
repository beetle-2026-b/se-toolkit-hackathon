import os
import json
import httpx
import traceback
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


class VerdictEvaluation(BaseModel):
    verdict: str  # "Correct", "Partially correct", "Incorrect"
    comment: str  # e.g., "The correct answer is: ..."


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
                        "max_tokens": 4000
                    },
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json"
                    },
                    timeout=60.0
                )
                response.raise_for_status()
                data = response.json()
                return data["choices"][0]["message"]["content"]
        except Exception as e:
            print(f"Qwen API error: {e}")
            traceback.print_exc()
            return None

    async def generate_cards(self, text: str, existing_questions: List[str] = None) -> List[GeneratedCard]:
        existing = existing_questions or []

        if existing:
            existing_list = "\n".join(f"- {q}" for q in existing[:30])
            prompt = f"""You are analyzing whether a source text has UNCOVERED concepts for new flashcards.

EXISTING QUESTIONS (already covered):
{existing_list}

SOURCE TEXT (the ONLY source of information — do NOT use outside knowledge):
{text}

TASK:
1. Check if there are ANY facts, concepts, or details in the source text that are NOT addressed by existing questions.
2. If yes, create 3-5 deeper questions that test understanding of relationships, mechanisms, or comparisons — using ONLY information from the source text.
3. If the source text is SHORT and all its key facts are already covered, return {{"cards": []}}.

IMPORTANT: Do NOT invent information not in the source text. Do NOT ask about implications, comparisons, or mechanisms not mentioned in the text. Only use what's actually written.

Return ONLY valid JSON."""

            response = await self._make_request([
                {"role": "system", "content": "You analyze whether a short source text has any uncovered facts. If all facts are covered or the text is too short, return empty cards. Never use outside knowledge. Only return valid JSON."},
                {"role": "user", "content": prompt}
            ])
        else:
            word_count = len(text.split())
            if word_count < 100:
                num_cards = "3-5"
            elif word_count < 300:
                num_cards = "5-8"
            elif word_count < 600:
                num_cards = "8-12"
            elif word_count < 1000:
                num_cards = "12-15"
            else:
                num_cards = "15-20"

            prompt = f"""You are an expert flashcard generator. Analyze the text below and create {num_cards} question-answer pairs that cover ALL key concepts, facts, and details.

Rules:
- Cover every important concept from the text
- Include both basic and detailed questions
- Do NOT repeat the same concept in multiple cards
- Each card should test a unique piece of knowledge
- Use ONLY information from the text

Return ONLY valid JSON in this exact format:
{{
  "cards": [
    {{"question": "Your question here", "answer": "Your answer here"}},
    ...
  ]
}}

Text:
{text}"""

            response = await self._make_request([
                {"role": "system", "content": f"You generate exactly enough flashcards to cover all key concepts in a text, no more and no less. Create {num_cards} cards. Always return valid JSON."},
                {"role": "user", "content": prompt}
            ])

        if not response:
            return []

        try:
            response = response.strip()

            # Strategy 1: Look for ```json...``` or ```...``` blocks
            if "```" in response:
                parts = response.split("```")
                for part in parts:
                    part = part.strip()
                    if part.startswith("json"):
                        part = part[4:].strip()
                    if part.startswith("{"):
                        try:
                            data = json.loads(part)
                            cards = data.get("cards", [])
                            if cards:
                                return [GeneratedCard(question=c["question"], answer=c["answer"]) for c in cards[:10]]
                        except json.JSONDecodeError:
                            continue

            # Strategy 2: Try parsing the whole response as JSON
            if response.startswith("{"):
                data = json.loads(response)
                cards = data.get("cards", [])
                return [GeneratedCard(question=c["question"], answer=c["answer"]) for c in cards[:10]]

            # Strategy 3: Find the first { and last } in the response
            start = response.find("{")
            end = response.rfind("}")
            if start != -1 and end != -1:
                json_str = response[start:end+1]
                data = json.loads(json_str)
                cards = data.get("cards", [])
                return [GeneratedCard(question=c["question"], answer=c["answer"]) for c in cards[:10]]

            print(f"No valid JSON found in response: {response[:200]}")
            return []
        except (json.JSONDecodeError, KeyError, TypeError) as e:
            print(f"Failed to parse Qwen response: {e}")
            print(f"Raw response: {response[:500]}")
            return []

    def _parse_json_response(self, response: str) -> Optional[dict]:
        """Robust JSON parsing from AI responses that may contain markdown or extra text."""
        if not response:
            return None
        response = response.strip()

        # Strategy 1: Look for ```json...``` or ```...``` blocks
        if "```" in response:
            parts = response.split("```")
            for part in parts:
                part = part.strip()
                if part.startswith("json"):
                    part = part[4:].strip()
                if part.startswith("{"):
                    try:
                        return json.loads(part)
                    except json.JSONDecodeError:
                        continue

        # Strategy 2: Try parsing the whole response as JSON
        if response.startswith("{"):
            try:
                return json.loads(response)
            except json.JSONDecodeError:
                pass

        # Strategy 3: Find the first { and last } in the response
        start = response.find("{")
        end = response.rfind("}")
        if start != -1 and end != -1:
            json_str = response[start:end+1]
            try:
                return json.loads(json_str)
            except json.JSONDecodeError:
                pass

        return None

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

        data = self._parse_json_response(response)
        if not data:
            return EvaluationResult(
                is_correct=False,
                confidence=0.0,
                feedback="Unable to evaluate answer. Please try again."
            )

        return EvaluationResult(
            is_correct=data.get("is_correct", False),
            confidence=float(data.get("confidence", 0.0)),
            feedback=data.get("feedback", "")
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

        data = self._parse_json_response(response)
        if not data:
            return ScoredEvaluation(
                score=0,
                label="Evaluation failed",
                comment="Could not evaluate answer. Please try again."
            )

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

    async def evaluate_quiz_verdict(self, question: str, correct_answer: str, user_answer: str) -> VerdictEvaluation:
        ca = correct_answer.strip().lower()
        ua = user_answer.strip().lower()

        # Known abbreviations and nicknames that are exact equivalents
        exact_nicknames = {
            'cavs': 'cleveland cavaliers',
            'cavaliers': 'cleveland cavaliers',
            'cleveland': 'cleveland cavaliers',
            'd rose': 'derrick rose',
            'dr rose': 'derrick rose',
            'magic': 'earvin johnson',
            'shaq': "shaquille o'neal",
            'o neal': "shaquille o'neal",
            "shaquille o'neal": "shaquille o'neal",
            'king james': 'lebron james',
            'bron': 'lebron james',
            'lj': 'lebron james',
            'lebron': 'lebron james',
            'bird': 'larry bird',
            'jordan': 'michael jordan',
            'mj': 'michael jordan',
            'kobe': 'kobe bryant',
            'kb': 'kobe bryant',
            'kd': 'kevin durant',
            'cp3': 'chris paul',
            'giannis': 'giannis antetokounmpo',
            'greek freak': 'giannis antetokounmpo',
            'kareem': 'kareem abdul-jabbar',
            'curry': 'stephen curry',
            'stephen curry': 'stephen curry',
        }

        # Check known nicknames
        if ua in exact_nicknames:
            nickname_value = exact_nicknames[ua].lower()
            if nickname_value == ca or nickname_value in ca or ca in nickname_value:
                return VerdictEvaluation(verdict="Correct", comment="Correct.")

        # Exact match
        if ua == ca:
            return VerdictEvaluation(verdict="Correct", comment="Correct.")

        # Partial match (user answer is a substring but not a known nickname)
        # e.g., "john" vs "john stockton" → Partially correct (not Correct)
        if ua in ca or ca in ua:
            # Check if it's a meaningful partial match
            ua_words = set(ua.split())
            ca_words = set(ca.split())
            matched_words = ua_words & ca_words
            
            # Only Correct if user provided ALL key words
            if matched_words and len(matched_words) == len(ca_words):
                return VerdictEvaluation(
                    verdict="Correct",
                    comment="Correct."
                )
            # User provided only part of the name/answer
            elif matched_words:
                return VerdictEvaluation(
                    verdict="Partially correct",
                    comment=f"Partially correct. The correct answer is: {correct_answer}."
                )
            else:
                return VerdictEvaluation(
                    verdict="Partially correct",
                    comment=f"Partially correct. The correct answer is: {correct_answer}."
                )

        # No direct match - use AI
        prompt = f"""Compare the student's answer with the correct answer. Determine if they mean the same thing.

Correct answer: {correct_answer}
Student's answer: {user_answer}

Rules:
- If the student's answer means the same thing (synonyms, abbreviations, nicknames, same concept) → verdict: "Correct", comment: "Correct."
- If the student's answer has some correct elements but is incomplete or partially wrong → verdict: "Partially correct", comment: "Partially correct. The correct answer is: {correct_answer}."
- If the student's answer is wrong or irrelevant → verdict: "Incorrect", comment: "Incorrect. The correct answer is: {correct_answer}."

Return ONLY valid JSON:
{{"verdict": "Correct", "comment": "Correct."}}"""

        response = await self._make_request([
            {"role": "system", "content": "Compare student answers with correct answers. Recognize synonyms, abbreviations, and equivalent meanings. Return ONLY JSON."},
            {"role": "user", "content": prompt}
        ])

        if not response:
            return VerdictEvaluation(
                verdict="Incorrect",
                comment=f"Incorrect. The correct answer is: {correct_answer}."
            )

        data = self._parse_json_response(response)
        if not data:
            return VerdictEvaluation(
                verdict="Incorrect",
                comment=f"Incorrect. The correct answer is: {correct_answer}."
            )

        verdict = data.get("verdict", "Incorrect")
        if verdict not in ("Correct", "Partially correct", "Incorrect"):
            verdict = "Incorrect"

        comment = data.get("comment", "")
        if not comment:
            if verdict == "Correct":
                comment = "Correct."
            elif verdict == "Partially correct":
                comment = f"Partially correct. The correct answer is: {correct_answer}."
            else:
                comment = f"Incorrect. The correct answer is: {correct_answer}."

        return VerdictEvaluation(verdict=verdict, comment=comment)


qwen_client = QwenClient()
