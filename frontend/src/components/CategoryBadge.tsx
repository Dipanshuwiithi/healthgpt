import { Stethoscope, Apple, Dumbbell, Brain, ShieldCheck, MessageCircle, AlertTriangle } from 'lucide-react';

interface CategoryMeta {
  label: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  color: string;
  bg: string;
}

const CATEGORY_MAP: Record<string, CategoryMeta> = {
  symptom_guidance: { label: 'Symptom guidance', icon: Stethoscope, color: '#7FB3FF', bg: '#1D2A45' },
  diet: { label: 'Diet suggestion', icon: Apple, color: '#E0A36B', bg: '#3A2C22' },
  exercise: { label: 'Exercise tip', icon: Dumbbell, color: '#6FC7D9', bg: '#1A323A' },
  mental_wellness: { label: 'Mental wellness', icon: Brain, color: '#C2A0F0', bg: '#2A1F3D' },
  preventive_care: { label: 'Preventive care', icon: ShieldCheck, color: '#7FD9A0', bg: '#1A3324' },
  general: { label: 'General', icon: MessageCircle, color: '#9AA3B2', bg: '#232A37' },
  emergency: { label: 'Emergency', icon: AlertTriangle, color: '#F2685C', bg: '#3A1F1E' },
};

export default function CategoryBadge({ category }: { category: string | null }) {
  if (!category || category === 'general') return null;

  const meta = CATEGORY_MAP[category] || CATEGORY_MAP.general;
  const Icon = meta.icon;

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        padding: '3px 9px',
        borderRadius: '999px',
        fontFamily: 'var(--font-mono)',
        fontSize: '11px',
        fontWeight: 500,
        letterSpacing: '0.02em',
        color: meta.color,
        background: meta.bg,
        marginBottom: '8px',
      }}
    >
      <Icon size={12} strokeWidth={2.25} />
      {meta.label}
    </span>
  );
}
