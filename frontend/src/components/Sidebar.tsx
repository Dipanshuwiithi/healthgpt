import { useState } from 'react';
import { Plus, MessageSquare, Trash2, Leaf } from 'lucide-react';
import type { ConversationSummary } from '../api';

interface Props {
  conversations: ConversationSummary[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNewChat: () => void;
  onDelete: (id: string) => void;
}

function formatRelativeDate(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function groupConversations(conversations: ConversationSummary[]) {
  const groups: Record<string, ConversationSummary[]> = {};
  for (const conv of conversations) {
    const label = formatRelativeDate(conv.updated_at);
    if (!groups[label]) groups[label] = [];
    groups[label].push(conv);
  }
  return groups;
}

export default function Sidebar({ conversations, activeId, onSelect, onNewChat, onDelete }: Props) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const grouped = groupConversations(conversations);

  return (
    <div
      style={{
        width: '264px',
        height: '100%',
        background: 'var(--bg-sidebar)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
      }}
    >
      {/* Brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '18px 16px 14px' }}>
        <div
          style={{
            width: '30px',
            height: '30px',
            borderRadius: '8px',
            background: 'var(--accent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Leaf size={16} color="#fff" strokeWidth={2.25} />
        </div>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: 600, color: 'var(--text)' }}>
          HealthGPT
        </span>
      </div>

      {/* New chat button */}
      <div style={{ padding: '0 12px 12px' }}>
        <button
          onClick={onNewChat}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 12px',
            borderRadius: '10px',
            border: '1px solid var(--border)',
            background: 'var(--surface)',
            color: 'var(--text)',
            fontSize: '13.5px',
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'background 0.15s, border-color 0.15s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--surface-alt)';
            e.currentTarget.style.borderColor = 'var(--accent)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'var(--surface)';
            e.currentTarget.style.borderColor = 'var(--border)';
          }}
        >
          <Plus size={16} />
          New chat
        </button>
      </div>

      {/* Conversation list */}
      <div className="chat-scroll" style={{ flex: 1, overflowY: 'auto', padding: '4px 8px 12px' }}>
        {conversations.length === 0 && (
          <p style={{ fontSize: '12.5px', color: 'var(--text-soft)', padding: '12px 8px', textAlign: 'center' }}>
            No conversations yet. Start chatting to see your history here.
          </p>
        )}

        {Object.entries(grouped).map(([label, convs]) => (
          <div key={label} style={{ marginBottom: '14px' }}>
            <p
              style={{
                fontSize: '11px',
                fontFamily: 'var(--font-mono)',
                color: 'var(--text-soft)',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                padding: '8px 8px 4px',
                margin: 0,
              }}
            >
              {label}
            </p>
            {convs.map((conv) => {
              const isActive = conv.id === activeId;
              const isHovered = conv.id === hoveredId;
              return (
                <div
                  key={conv.id}
                  onClick={() => onSelect(conv.id)}
                  onMouseEnter={() => setHoveredId(conv.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '9px 10px',
                    borderRadius: '8px',
                    background: isActive ? 'var(--surface-alt)' : 'transparent',
                    cursor: 'pointer',
                    marginBottom: '2px',
                    transition: 'background 0.12s',
                  }}
                >
                  <MessageSquare
                    size={14}
                    color={isActive ? 'var(--accent)' : 'var(--text-soft)'}
                    style={{ flexShrink: 0 }}
                  />
                  <span
                    style={{
                      flex: 1,
                      fontSize: '13px',
                      color: isActive ? 'var(--text)' : 'var(--text-soft)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {conv.title}
                  </span>
                  {(isHovered || isActive) && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(conv.id);
                      }}
                      title="Delete conversation"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '22px',
                        height: '22px',
                        borderRadius: '6px',
                        border: 'none',
                        background: 'transparent',
                        color: 'var(--text-soft)',
                        cursor: 'pointer',
                        flexShrink: 0,
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'var(--emergency-bg)';
                        e.currentTarget.style.color = 'var(--emergency)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.color = 'var(--text-soft)';
                      }}
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Footer disclaimer */}
      <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)' }}>
        <p style={{ fontSize: '10.5px', color: 'var(--text-soft)', margin: 0, lineHeight: 1.4 }}>
          Not a substitute for professional medical advice.
        </p>
      </div>
    </div>
  );
}
