"""
main.py
-------
FastAPI application entrypoint for the Healthcare Assistant Chatbot.

Endpoints:
    POST   /api/session              -> create a new conversation
    POST   /api/chat                  -> send a message, get a bot reply
    GET    /api/conversations         -> list all conversations (sidebar)
    GET    /api/history/{id}          -> fetch a conversation's full history
    DELETE /api/session/{id}          -> delete a conversation entirely
    GET    /api/health                -> health check
"""

import os
import uuid
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# IMPORTANT: load environment variables BEFORE importing any local modules.
# app.llm reads GEMINI_API_KEY at import time, so .env must be loaded first.
load_dotenv()

from .schemas import (
    ChatRequest,
    ChatResponse,
    HistoryResponse,
    HistoryMessage,
    NewSessionResponse,
    ConversationSummary,
    ConversationListResponse,
)
from . import db
from .safety import contains_emergency_keywords, EMERGENCY_RESPONSE, ensure_disclaimer
from .llm import generate_response

db.init_db()

app = FastAPI(
    title="HealthGPT API",
    description="Backend API for an LLM-powered healthcare assistant chatbot "
    "with persistent conversation history and safety guardrails.",
    version="2.0.0",
)

# --------------------------------------------------------------------------
# CORS configuration
# --------------------------------------------------------------------------
allowed_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in allowed_origins],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --------------------------------------------------------------------------
# Routes
# --------------------------------------------------------------------------
@app.get("/api/health")
def health_check():
    return {"status": "ok"}


@app.post("/api/session", response_model=NewSessionResponse)
def create_session():
    """Create a new, empty conversation and return its ID.
    The conversation row is created immediately (with a placeholder title)
    so it's safe to call /api/history or /api/chat right after."""
    session_id = str(uuid.uuid4())
    db.create_conversation(session_id)
    return NewSessionResponse(session_id=session_id)


@app.post("/api/chat", response_model=ChatResponse)
def chat(request: ChatRequest):
    """
    Main chat endpoint.

    Workflow:
    1. Ensure the conversation exists (create it if the client sent an
       unknown session_id, e.g. after a backend restart in dev).
    2. Check the incoming message for emergency red-flag keywords.
       If found, respond immediately without calling the LLM.
    3. Otherwise, retrieve conversation history, call the LLM with full
       context, and store both the user message and assistant reply.
    4. Apply post-processing safety checks (disclaimer enforcement).
    5. Auto-title the conversation from the first user message.
    """
    user_message = request.message.strip()
    session_id = request.session_id

    if not user_message:
        raise HTTPException(status_code=400, detail="Message cannot be empty.")

    if not db.conversation_exists(session_id):
        db.create_conversation(session_id)

    # Auto-title from the first message (mirrors ChatGPT's behavior)
    db.maybe_set_title_from_first_message(session_id, user_message)

    # --- Emergency keyword guardrail ---
    if contains_emergency_keywords(user_message):
        db.add_message(session_id, "user", user_message, "emergency")
        db.add_message(session_id, "assistant", EMERGENCY_RESPONSE, "emergency")
        title = db.get_conversation_title(session_id)
        return ChatResponse(
            session_id=session_id,
            reply=EMERGENCY_RESPONSE,
            category="emergency",
            is_emergency=True,
            title=title,
        )

    # --- Retrieve history & call LLM ---
    history = db.get_recent_messages_for_llm(session_id)
    reply_text, category = generate_response(user_message, history)

    # --- Post-processing safety check ---
    reply_text = ensure_disclaimer(category, reply_text)

    # --- Persist conversation ---
    db.add_message(session_id, "user", user_message)
    db.add_message(session_id, "assistant", reply_text, category)

    title = db.get_conversation_title(session_id)

    return ChatResponse(
        session_id=session_id,
        reply=reply_text,
        category=category,
        is_emergency=False,
        title=title,
    )


@app.get("/api/conversations", response_model=ConversationListResponse)
def list_conversations():
    """List all conversations, most recently active first (sidebar data)."""
    rows = db.list_conversations()
    return ConversationListResponse(
        conversations=[ConversationSummary(**row) for row in rows]
    )


@app.get("/api/history/{session_id}", response_model=HistoryResponse)
def get_history(session_id: str):
    """Retrieve the full conversation history for a session."""
    if not db.conversation_exists(session_id):
        raise HTTPException(status_code=404, detail="Conversation not found.")
    messages = db.get_messages(session_id)
    return HistoryResponse(
        session_id=session_id,
        messages=[HistoryMessage(**m) for m in messages],
    )


@app.delete("/api/session/{session_id}")
def delete_session(session_id: str):
    """Permanently delete a conversation and all its messages."""
    db.delete_conversation(session_id)
    return {"status": "deleted", "session_id": session_id}
