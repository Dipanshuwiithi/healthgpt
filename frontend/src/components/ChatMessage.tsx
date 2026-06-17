import CategoryBadge from './CategoryBadge';
import { Leaf, User } from 'lucide-react';

interface Props {
  role: 'user' | 'assistant';
  content: string;
  category?: string | null;
  isEmergency?: boolean;
}

// Minimal markdown-ish rendering: bold (**text**), line breaks, bullet lists
function renderContent(text: string) {
  const lines = text.split('\n');
  return lines.map((line, i) => {
    const trimmed = line.trim();
    const parts = line.split(/(\*\*[^*]+\*\*)/g);
    const rendered = parts.map((part, j) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={j}>{part.slice(2, -2)}</strong>;
      }
      // italic disclaimer text wrapped in single underscores
      if (part.startsWith('_') && part.endsWith('_') && part.length > 2) {
        return <em key={j} style={{ color: 'var(--ink-soft)', fontSize: '13px' }}>{part.slice(1, -1)}</em>;
      }
      return part;
    });

    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      return (
        <li key={i} style={{ marginLeft: '4px' }}>
          {renderInline(trimmed.slice(2))}
        </li>
      );
    }
    if (trimmed === '') return <div key={i} style={{ height: '8px' }} />;
    return <div key={i}>{rendered}</div>;
  });
}

function renderInline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, j) =>
    part.startsWith('**') && part.endsWith('**') ? <strong key={j}>{part.slice(2, -2)}</strong> : part
  );
}

export default function ChatMessage({ role, content, category, isEmergency }: Props) {
  const isUser = role === 'user';

  return (
    <div
      style={{
        display: 'flex',
        gap: '10px',
        alignItems: 'flex-start',
        justifyContent: isUser ? 'flex-end' : 'flex-start',
        marginBottom: '18px',
      }}
    >
      {!isUser && (
        <div
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: isEmergency ? 'var(--emergency-bg)' : 'var(--accent-soft)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            marginTop: '2px',
          }}
        >
          <Leaf size={16} color={isEmergency ? 'var(--emergency)' : 'var(--accent)'} strokeWidth={2} />
        </div>
      )}

      <div style={{ maxWidth: '72%', display: 'flex', flexDirection: 'column', alignItems: isUser ? 'flex-end' : 'flex-start' }}>
        {!isUser && category && <CategoryBadge category={category} />}
        <div
          style={{
            background: isUser ? 'var(--accent)' : isEmergency ? 'var(--emergency-bg)' : 'var(--surface)',
            color: isUser ? '#fff' : 'var(--text)',
            border: isUser ? 'none' : `1px solid ${isEmergency ? 'var(--emergency)' : 'var(--border)'}`,
            borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
            padding: '12px 16px',
            fontSize: '14.5px',
            lineHeight: '1.6',
            boxShadow: isUser ? 'none' : '0 1px 3px rgba(0, 0, 0, 0.25)',
          }}
        >
          {renderContent(content)}
        </div>
      </div>

      {isUser && (
        <div
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: 'var(--accent-dark)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            marginTop: '2px',
          }}
        >
          <User size={15} color="#fff" strokeWidth={2} />
        </div>
      )}
    </div>
  );
}
