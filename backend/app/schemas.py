"""
schemas.py
----------
Pydantic models for request/response validation.
"""

from pydantic import BaseModel, Field
from typing import List, Optional


class ChatRequest(BaseModel):
    session_id: str = Field(..., description="Conversation ID")
    message: str = Field(..., min_length=1, max_length=2000)


class ChatResponse(BaseModel):
    session_id: str
    reply: str
    category: str
    is_emergency: bool = False
    title: Optional[str] = None  # returned so the frontend can update the sidebar immediately


class HistoryMessage(BaseModel):
    role: str
    content: str
    category: Optional[str] = None
    timestamp: str


class HistoryResponse(BaseModel):
    session_id: str
    messages: List[HistoryMessage]


class NewSessionResponse(BaseModel):
    session_id: str


class ConversationSummary(BaseModel):
    id: str
    title: str
    created_at: str
    updated_at: str


class ConversationListResponse(BaseModel):
    conversations: List[ConversationSummary]
