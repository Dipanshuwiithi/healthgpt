// api.ts — thin wrapper around the FastAPI backend endpoints

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export interface ChatResponse {
  session_id: string;
  reply: string;
  category: string;
  is_emergency: boolean;
  title: string | null;
}

export interface HistoryMessage {
  role: 'user' | 'assistant';
  content: string;
  category: string | null;
  timestamp: string;
}

export interface ConversationSummary {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export async function createSession(): Promise<string> {
  const res = await fetch(`${API_BASE}/api/session`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to create session');
  const data = await res.json();
  return data.session_id;
}

export async function sendMessage(sessionId: string, message: string): Promise<ChatResponse> {
  const res = await fetch(`${API_BASE}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id: sessionId, message }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(err.detail || 'Failed to send message');
  }
  return res.json();
}

export async function fetchHistory(sessionId: string): Promise<HistoryMessage[]> {
  const res = await fetch(`${API_BASE}/api/history/${sessionId}`);
  if (!res.ok) throw new Error('Failed to fetch history');
  const data = await res.json();
  return data.messages;
}

export async function fetchConversations(): Promise<ConversationSummary[]> {
  const res = await fetch(`${API_BASE}/api/conversations`);
  if (!res.ok) throw new Error('Failed to fetch conversations');
  const data = await res.json();
  return data.conversations;
}

export async function deleteConversation(sessionId: string): Promise<void> {
  await fetch(`${API_BASE}/api/session/${sessionId}`, { method: 'DELETE' });
}
