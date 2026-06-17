"""
llm.py
------
Wraps the Google Gemini API for the healthcare chatbot.

Responsibilities:
- Build the prompt (system instructions + conversation history + new message)
- Call the Gemini API
- Parse out a response category (for UI tagging) from the model's reply
- Return clean text + category to the caller
"""

import os
import re
import json
import google.generativeai as genai
from typing import List, Tuple
from dotenv import load_dotenv

from .safety import SYSTEM_PROMPT

# Ensure .env is loaded even if this module is imported before main.py's
# load_dotenv() call (e.g. in tests or alternate entrypoints). dotenv's
# default behavior won't override variables already set in the real
# environment, so this is safe to call multiple times.
load_dotenv()


def _get_api_key() -> str:
    """Read the Gemini API key at call time (not just at import time)."""
    return os.getenv("GEMINI_API_KEY", "")


MODEL_NAME = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

if _get_api_key():
    genai.configure(api_key=_get_api_key())

VALID_CATEGORIES = {
    "symptom_guidance",
    "diet",
    "exercise",
    "mental_wellness",
    "preventive_care",
    "general",
    "emergency",
}

CATEGORY_INSTRUCTION = (
    "\n\nIMPORTANT: At the very end of your reply, on its own new line, "
    "output a tag in the exact format: [[CATEGORY: <one_of:"
    "symptom_guidance,diet,exercise,mental_wellness,preventive_care,general>]]\n"
    "Do not explain the tag. It must be the last line."
)


def _build_history_for_gemini(history: List[dict]) -> List[dict]:
    """Convert stored message dicts (role/content) into Gemini's chat history format."""
    gemini_history = []
    for msg in history:
        role = "user" if msg["role"] == "user" else "model"
        gemini_history.append({"role": role, "parts": [msg["content"]]})
    return gemini_history


def _extract_category(text: str) -> Tuple[str, str]:
    """
    Extract the [[CATEGORY: xxx]] tag from the model's reply.
    Returns (clean_text, category). Defaults to 'general' if not found/invalid.
    """
    match = re.search(r"\[\[CATEGORY:\s*([a-z_]+)\s*\]\]", text, re.IGNORECASE)
    category = "general"
    clean_text = text
    if match:
        candidate = match.group(1).lower().strip()
        if candidate in VALID_CATEGORIES:
            category = candidate
        clean_text = text[: match.start()].rstrip()
    return clean_text, category


def generate_response(user_message: str, history: List[dict]) -> Tuple[str, str]:
    """
    Generate a chatbot response.

    Args:
        user_message: the latest message from the user
        history: prior conversation messages (already trimmed)

    Returns:
        (response_text, category)
    """
    api_key = _get_api_key()
    if not api_key:
        return (
            "⚠️ Server configuration error: GEMINI_API_KEY is not set. "
            "Please add your Gemini API key to the backend .env file.",
            "general",
        )

    genai.configure(api_key=api_key)
    model = genai.GenerativeModel(
        model_name=MODEL_NAME,
        system_instruction=SYSTEM_PROMPT + CATEGORY_INSTRUCTION,
    )

    gemini_history = _build_history_for_gemini(history)

    try:
        chat = model.start_chat(history=gemini_history)
        response = chat.send_message(user_message)
        raw_text = response.text or ""
    except Exception as exc:  # noqa: BLE001
        return (
            f"⚠️ Sorry, I had trouble reaching the AI service. "
            f"Please try again in a moment. (Error: {exc})",
            "general",
        )

    clean_text, category = _extract_category(raw_text)
    if not clean_text.strip():
        clean_text = raw_text  # fallback if extraction stripped everything

    return clean_text.strip(), category
