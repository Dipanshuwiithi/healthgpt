import { useState, useEffect, useRef } from 'react';
import { Send } from 'lucide-react';
import ChatMessage from './components/ChatMessage';
import TypingIndicator from './components/TypingIndicator';
import SuggestionChips from './components/SuggestionChips';
import Sidebar from './components/Sidebar';
import {
  createSession,
  sendMessage,
  fetchHistory,
  fetchConversations,
  deleteConversation,
  type ConversationSummary,
} from './api';

interface DisplayMessage {
  role: 'user' | 'assistant';
  content: string;
  category?: string | null;
  isEmergency?: boolean;
}

const WELCOME: DisplayMessage = {
  role: 'assistant',
  content:
    "Hi, I'm **HealthGPT** 🌿 — your AI wellness companion. I can offer general guidance on symptoms, " +
    "diet, exercise, mental wellness, and preventive care.\n\n" +
    "_I can't diagnose conditions or prescribe treatment — for that, please see a licensed healthcare professional. " +
    "If you ever have a medical emergency, contact your local emergency services immediately._\n\n" +
    "What's on your mind today?",
  category: null,
};

export default function App() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<DisplayMessage[]>([WELCOME]);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  async function refreshConversations() {
    try {
      const convs = await fetchConversations();
      setConversations(convs);
    } catch {
      // Non-fatal: sidebar just stays stale/empty if this fails.
    }
  }

  // Initial load: start a fresh conversation + load the sidebar list.
  useEffect(() => {
    createSession()
      .then((id) => {
        setSessionId(id);
        refreshConversations();
      })
      .catch(() => setError('Could not connect to the server. Is the backend running?'));
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  async function handleSend(text?: string) {
    const messageText = (text ?? input).trim();
    if (!messageText || !sessionId || loading) return;

    setMessages((prev) => [...prev, { role: 'user', content: messageText }]);
    setInput('');
    setLoading(true);
    setError(null);

    try {
      const res = await sendMessage(sessionId, messageText);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: res.reply, category: res.category, isEmergency: res.is_emergency },
      ]);
      // Refresh sidebar so the new/auto-titled conversation shows up immediately.
      refreshConversations();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleNewChat() {
    const newId = await createSession().catch(() => null);
    setSessionId(newId);
    setMessages([WELCOME]);
    setError(null);
    refreshConversations();
  }

  async function handleSelectConversation(id: string) {
    if (id === sessionId) return;
    setHistoryLoading(true);
    setError(null);
    try {
      const history = await fetchHistory(id);
      setSessionId(id);
      if (history.length === 0) {
        setMessages([WELCOME]);
      } else {
        setMessages(
          history.map((m) => ({
            role: m.role,
            content: m.content,
            category: m.category,
            isEmergency: m.category === 'emergency',
          }))
        );
      }
    } catch {
      setError('Could not load that conversation.');
    } finally {
      setHistoryLoading(false);
    }
  }

  async function handleDeleteConversation(id: string) {
    await deleteConversation(id);
    if (id === sessionId) {
      // The active conversation was deleted — start a fresh one.
      await handleNewChat();
    } else {
      refreshConversations();
    }
  }

  const showSuggestions = messages.length === 1;

  return (
    <div style={{ height: '100vh', display: 'flex', background: 'var(--bg)' }}>
      <Sidebar
        conversations={conversations}
        activeId={sessionId}
        onSelect={handleSelectConversation}
        onNewChat={handleNewChat}
        onDelete={handleDeleteConversation}
      />

      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          maxWidth: '760px',
          margin: '0 auto',
          width: '100%',
          minWidth: 0,
        }}
      >
        {/* Chat area */}
        <div ref={scrollRef} className="chat-scroll" style={{ flex: 1, overflowY: 'auto', padding: '24px 24px 20px' }}>
          {historyLoading ? (
            <TypingIndicator />
          ) : (
            <>
              {messages.map((m, i) => (
                <ChatMessage key={i} role={m.role} content={m.content} category={m.category} isEmergency={m.isEmergency} />
              ))}
              {loading && <TypingIndicator />}

              {showSuggestions && !loading && (
                <div style={{ marginLeft: '42px' }}>
                  <p style={{ fontSize: '12px', color: 'var(--ink-soft)', marginBottom: '8px', fontFamily: 'var(--font-mono)' }}>
                    TRY ASKING
                  </p>
                  <SuggestionChips onSelect={(text) => handleSend(text)} />
                </div>
              )}
            </>
          )}

          {error && (
            <div
              style={{
                background: 'var(--emergency-bg)',
                border: '1px solid var(--emergency)',
                borderRadius: '10px',
                padding: '10px 14px',
                fontSize: '13px',
                color: 'var(--emergency)',
                marginTop: '8px',
              }}
            >
              {error}
            </div>
          )}
        </div>

        {/* Input bar */}
        <div style={{ padding: '8px 24px 22px', flexShrink: 0 }}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            style={{ display: 'flex', gap: '10px' }}
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about symptoms, diet, exercise, or wellness…"
              disabled={!sessionId || loading}
              style={{
                flex: 1,
                padding: '13px 18px',
                borderRadius: '999px',
                border: '1px solid var(--line)',
                background: 'var(--paper)',
                fontSize: '14px',
                fontFamily: 'var(--font-body)',
                color: 'var(--ink)',
                outline: 'none',
                transition: 'border-color 0.15s, box-shadow 0.15s',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = 'var(--accent)';
                e.currentTarget.style.boxShadow = '0 0 0 3px var(--accent-soft)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'var(--line)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
            <button
              type="submit"
              disabled={!sessionId || loading || !input.trim()}
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '50%',
                border: 'none',
                background: !input.trim() || loading ? 'var(--line)' : 'var(--sage)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: !input.trim() || loading ? 'default' : 'pointer',
                flexShrink: 0,
                transition: 'background 0.15s',
              }}
            >
              <Send size={18} strokeWidth={2.25} />
            </button>
          </form>
          <p style={{ fontSize: '11px', color: 'var(--ink-soft)', textAlign: 'center', marginTop: '10px', marginBottom: 0 }}>
            HealthGPT provides general wellness information only — not a substitute for professional medical advice.
          </p>
        </div>
      </div>
    </div>
  );
}
