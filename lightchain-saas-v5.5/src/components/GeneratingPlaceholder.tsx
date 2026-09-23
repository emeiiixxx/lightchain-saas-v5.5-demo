import type { CSSProperties } from 'react';
import { useLocale } from '../LocaleContext';
import { usePresence } from '../usePresence';
import './generating-placeholder.css';

// Figma v5.3 103:4313 → Image/GeneratingPlaceholder 103:4264.
// Original gradient exports; the cluster rotates once every three seconds.
export function GeneratingPlaceholder({ style, active = true, suspended = false }: { style?: CSSProperties; active?: boolean; suspended?: boolean }) {
  const { locale } = useLocale();
  const shown = usePresence(active ? true : null);
  if (!shown.value) return null;
  const label = locale === 'en' ? 'Generating...' : '生成中...';
  return <div className="generating-placeholder" data-suspended={suspended} style={style} data-phase={shown.phase} role="status" aria-label={active ? label : undefined} aria-busy={active} aria-hidden={!active}>
    <div className="generating-placeholder-motion" aria-hidden="true">
      {['green', 'blue', 'purple'].map(color => <div key={color} className={`generating-placeholder-${color}`}><img src={`/assets/generation-loading/${color}.svg`} alt="" draggable={false} /></div>)}
    </div>
    <div className="generating-placeholder-status">
      <div className="generating-placeholder-progress" role="progressbar" aria-label={label}>
        <div className="generating-placeholder-progress-fill" />
      </div>
      <span>{label}</span>
    </div>
  </div>;
}
