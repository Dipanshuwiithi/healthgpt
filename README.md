# HealthGPT — Healthcare Assistant Chatbot using LLMs and Agentic AI

An AI-powered healthcare chatbot that provides general health information,
symptom guidance, diet and exercise suggestions, mental wellness tips, and
preventive healthcare information — without providing medical diagnoses.
Conversations persist across sessions and are browsable from a ChatGPT-style
sidebar.

## Tech Stack

- **Backend:** Python, FastAPI, Google Gemini API, SQLite
- **Frontend:** React + TypeScript (Vite)
- **Persistence:** SQLite database (`backend/healthgpt.db`) storing conversations and messages
- **Safety:** Keyword-based emergency detection + LLM system-prompt guardrails

## Project Structure

```
healthcare-chatbot/
├── backend/
│   ├── app/
│   │   ├── main.py        # FastAPI app & routes
│   │   ├── llm.py          # Gemini integration
│   │   ├── db.py           # SQLite persistence (conversations & messages)
│   │   ├── safety.py       # Guardrails & system prompt
│   │   └── schemas.py      # Pydantic request/response models
│   ├── requirements.txt
│   └── .env.example
└── frontend/
    ├── src/
    │   ├── App.tsx
    │   ├── api.ts
    │   └── components/
    │       ├── Sidebar.tsx
    │       ├── ChatMessage.tsx
    │       ├── CategoryBadge.tsx
    │       ├── SuggestionChips.tsx
    │       └── TypingIndicator.tsx
    └── .env.example
```

## Setup & Run

### 1. Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate        # On Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env
# Edit .env and add your GEMINI_API_KEY
# Get a free key from: https://aistudio.google.com/app/apikey

uvicorn app.main:app --reload --port 8000
```

Backend runs at `http://localhost:8000`. Interactive API docs at
`http://localhost:8000/docs`. A `healthgpt.db` SQLite file is created
automatically in the `backend/` folder on first run.

### 2. Frontend

```bash
cd frontend
npm install
cp .env.example .env   # defaults to http://localhost:8000

npm run dev
```

Frontend runs at `http://localhost:5173`.

## API Endpoints

| Method | Endpoint                | Description                              |
|--------|--------------------------|-------------------------------------------|
| POST   | `/api/session`           | Create a new conversation                  |
| POST   | `/api/chat`               | Send a message, get a bot reply             |
| GET    | `/api/conversations`     | List all conversations (sidebar data)       |
| GET    | `/api/history/{id}`      | Get full message history for a conversation |
| DELETE | `/api/session/{id}`      | Permanently delete a conversation           |
| GET    | `/api/health`             | Health check                                 |

## How It Works

1. **Persistent Conversations** — Every conversation is a row in the
   `conversations` table (SQLite), with its messages in a linked `messages`
   table. Unlike the original in-memory version, history survives backend
   restarts and browser refreshes — switching conversations in the sidebar
   reloads the full message history from the database.

2. **Sidebar (ChatGPT-style)** — The frontend fetches `/api/conversations`
   on load and after every message, grouping conversations by relative date
   (Today, Yesterday, X days ago). Clicking a conversation loads its history;
   "New chat" starts a fresh one; the trash icon deletes a conversation
   permanently (with its messages, via SQL `ON DELETE CASCADE`).

3. **Auto-titling** — The first user message in a conversation becomes its
   title (truncated to ~48 characters), mirroring ChatGPT's behavior. This
   happens server-side in `db.maybe_set_title_from_first_message()`.

4. **Symptom-Checking Workflow** — A carefully engineered system prompt
   instructs Gemini to give general guidance, not diagnoses, and to always
   recommend consulting a healthcare professional.

5. **Safety Guardrails** —
   - A regex-based keyword filter checks every incoming message for
     emergency red flags (chest pain, suicidal ideation, severe bleeding,
     etc.). If detected, the bot immediately returns an emergency-resources
     message **without** calling the LLM.
   - The system prompt enforces "no diagnosis, no prescriptions" rules.
   - A post-processing step appends a disclaimer to medically-relevant
     replies if the model forgot to include one.

6. **Response Categorization** — Gemini tags each reply with one of:
   `symptom_guidance`, `diet`, `exercise`, `mental_wellness`,
   `preventive_care`, `general`, or `emergency`. The frontend displays this
   as a colored badge above the message.

## Disclaimer

This chatbot is for educational/informational purposes only and is **not**
a substitute for professional medical advice, diagnosis, or treatment.
Always seek the advice of a qualified healthcare provider.
