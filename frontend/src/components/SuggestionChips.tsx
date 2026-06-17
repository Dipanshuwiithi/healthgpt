interface Props {
  onSelect: (text: string) => void;
}

const SUGGESTIONS = [
  { label: 'I have a headache and feel tired', icon: '🤕' },
  { label: 'Suggest a balanced diet for weight loss', icon: '🥗' },
  { label: 'Give me a beginner home workout plan', icon: '🏋️' },
  { label: 'I feel stressed and can\u2019t sleep well', icon: '🧘' },
  { label: 'What vaccinations should adults keep up with?', icon: '💉' },
];

export default function SuggestionChips({ onSelect }: Props) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '4px' }}>
      {SUGGESTIONS.map((s) => (
        <button
          key={s.label}
          onClick={() => onSelect(s.label)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 14px',
            borderRadius: '999px',
            border: '1px solid var(--line)',
            background: 'var(--paper)',
            color: 'var(--ink)',
            fontSize: '13px',
            cursor: 'pointer',
            transition: 'border-color 0.15s, background 0.15s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'var(--sage)';
            e.currentTarget.style.background = 'var(--sage-light)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--line)';
            e.currentTarget.style.background = 'var(--paper)';
          }}
        >
          <span aria-hidden="true">{s.icon}</span>
          {s.label}
        </button>
      ))}
    </div>
  );
}
