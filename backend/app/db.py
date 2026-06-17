"""
db.py
-----
Persistence layer for conversations and messages, backed by SQLAlchemy Core.

Supports two modes, selected automatically via the DATABASE_URL env var:
  - Production: PostgreSQL (e.g. Render's free Postgres add-on).
    Set DATABASE_URL to a postgres:// connection string.
  - Local dev: SQLite file (backend/healthgpt.db), used automatically when
    DATABASE_URL is not set. No setup required to run the project locally.

Schema:
    conversations(id TEXT PK, title TEXT, created_at TEXT, updated_at TEXT)
    messages(id INTEGER PK AUTOINCREMENT, conversation_id TEXT FK,
             role TEXT, content TEXT, category TEXT, timestamp TEXT)
"""

import os
from datetime import datetime
from typing import List, Optional, Dict, Any

from sqlalchemy import (
    create_engine,
    text,
    MetaData,
    Table,
    Column,
    String,
    Integer,
    Text,
    ForeignKey,
)

# --------------------------------------------------------------------------
# Engine setup — Postgres in production, SQLite for local development.
# --------------------------------------------------------------------------
DATABASE_URL = os.getenv("DATABASE_URL", "")

if DATABASE_URL:
    # Render (and most providers) hand out URLs starting with "postgres://",
    # but SQLAlchemy's psycopg driver expects "postgresql://".
    if DATABASE_URL.startswith("postgres://"):
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)
    engine = create_engine(DATABASE_URL, pool_pre_ping=True)
    IS_POSTGRES = True
else:
    DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "healthgpt.db")
    engine = create_engine(f"sqlite:///{DB_PATH}", connect_args={"check_same_thread": False})
    IS_POSTGRES = False

metadata = MetaData()

conversations_table = Table(
    "conversations",
    metadata,
    Column("id", String, primary_key=True),
    Column("title", Text, nullable=False),
    Column("created_at", String, nullable=False),
    Column("updated_at", String, nullable=False),
)

messages_table = Table(
    "messages",
    metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("conversation_id", String, ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False),
    Column("role", String, nullable=False),
    Column("content", Text, nullable=False),
    Column("category", String, nullable=True),
    Column("timestamp", String, nullable=False),
)

MAX_HISTORY_TURNS = 12  # turns of context sent to the LLM per request


def init_db():
    """Create tables if they don't exist. Safe to call on every startup."""
    metadata.create_all(engine)


def _make_title(first_message: str) -> str:
    cleaned = " ".join(first_message.strip().split())
    if len(cleaned) <= 48:
        return cleaned
    return cleaned[:45].rstrip() + "..."


def create_conversation(conversation_id: str, first_message: Optional[str] = None) -> Dict[str, Any]:
    now = datetime.utcnow().isoformat()
    title = _make_title(first_message) if first_message else "New conversation"
    with engine.begin() as conn:
        conn.execute(
            conversations_table.insert().values(
                id=conversation_id, title=title, created_at=now, updated_at=now
            )
        )
    return {"id": conversation_id, "title": title, "created_at": now, "updated_at": now}


def conversation_exists(conversation_id: str) -> bool:
    with engine.connect() as conn:
        row = conn.execute(
            conversations_table.select().where(conversations_table.c.id == conversation_id)
        ).fetchone()
        return row is not None


def maybe_set_title_from_first_message(conversation_id: str, message: str):
    with engine.begin() as conn:
        row = conn.execute(
            conversations_table.select().where(conversations_table.c.id == conversation_id)
        ).fetchone()
        if row and row.title == "New conversation":
            conn.execute(
                conversations_table.update()
                .where(conversations_table.c.id == conversation_id)
                .values(title=_make_title(message))
            )


def touch_conversation(conversation_id: str):
    now = datetime.utcnow().isoformat()
    with engine.begin() as conn:
        conn.execute(
            conversations_table.update()
            .where(conversations_table.c.id == conversation_id)
            .values(updated_at=now)
        )


def get_conversation_title(conversation_id: str) -> Optional[str]:
    with engine.connect() as conn:
        row = conn.execute(
            conversations_table.select().where(conversations_table.c.id == conversation_id)
        ).fetchone()
        return row.title if row else None


def list_conversations() -> List[Dict[str, Any]]:
    with engine.connect() as conn:
        rows = conn.execute(
            conversations_table.select().order_by(conversations_table.c.updated_at.desc())
        ).fetchall()
        return [dict(r._mapping) for r in rows]


def delete_conversation(conversation_id: str):
    with engine.begin() as conn:
        # Explicitly delete messages first for SQLite, which doesn't enforce
        # ON DELETE CASCADE unless foreign_keys pragma is enabled per-connection.
        conn.execute(
            messages_table.delete().where(messages_table.c.conversation_id == conversation_id)
        )
        conn.execute(
            conversations_table.delete().where(conversations_table.c.id == conversation_id)
        )


def add_message(conversation_id: str, role: str, content: str, category: Optional[str] = None):
    timestamp = datetime.utcnow().isoformat()
    with engine.begin() as conn:
        conn.execute(
            messages_table.insert().values(
                conversation_id=conversation_id,
                role=role,
                content=content,
                category=category,
                timestamp=timestamp,
            )
        )
    touch_conversation(conversation_id)


def get_messages(conversation_id: str) -> List[Dict[str, Any]]:
    with engine.connect() as conn:
        rows = conn.execute(
            messages_table.select()
            .where(messages_table.c.conversation_id == conversation_id)
            .order_by(messages_table.c.id.asc())
        ).fetchall()
        return [
            {"role": r.role, "content": r.content, "category": r.category, "timestamp": r.timestamp}
            for r in rows
        ]


def get_recent_messages_for_llm(conversation_id: str) -> List[Dict[str, Any]]:
    all_messages = get_messages(conversation_id)
    max_messages = MAX_HISTORY_TURNS * 2
    return all_messages[-max_messages:] if len(all_messages) > max_messages else all_messages
