import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { usePresence } from '../usePresence';

// Same image bubble sizing and hover behavior as v5.3 AI try-on history.
export function GenerationImageTag({ src, label, active }: { src: string; label: string; active: boolean }) {
  const anchor = useRef<HTMLButtonElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ratio = useRef(1);
  const id = useId();
  const [open, setOpen] = useState(false);
  const shown = usePresence(active && open ? src : null);
  const [position, setPosition] = useState({ left: 0, top: 0, height: 240 });
  function keepOpen() { if (timer.current) clearTimeout(timer.current); }
  function closeSoon() { keepOpen(); timer.current = setTimeout(() => setOpen(false), 100); }
  function show() { keepOpen(); setOpen(true); }
  function place() {
    const rect = anchor.current?.getBoundingClientRect();
    if (!rect) return;
    const below = window.innerHeight - rect.bottom - 16;
    const above = rect.top - 16;
    const height = Math.max(1, Math.min(240, Math.max(below, above) - 8, (window.innerWidth - 24) / ratio.current));
    const width = height * ratio.current + 8;
    const top = below >= height + 8 ? rect.bottom + 4 : Math.max(8, rect.top - height - 12);
    setPosition({ left: Math.max(8, Math.min(rect.left, window.innerWidth - width - 8)), top, height });
  }
  useLayoutEffect(() => { if (shown.value) place(); }, [shown.value]);
  useEffect(() => {
    if (!open) return;
    const close = () => { keepOpen(); setOpen(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') close(); };
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    window.addEventListener('keydown', escape);
    window.addEventListener('pointerdown', close);
    return () => {
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
      window.removeEventListener('keydown', escape);
      window.removeEventListener('pointerdown', close);
    };
  }, [open]);
  useEffect(() => { if (!active) { keepOpen(); setOpen(false); } }, [active]);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  return <><span className="generation-record-tag generation-record-tag--image">
    <button ref={anchor} type="button" className="generation-tag-thumb" aria-label={label} aria-describedby={open && active ? id : undefined} onMouseEnter={show} onMouseLeave={closeSoon} onFocus={show} onBlur={closeSoon} onClick={show}>
      <img src={src} width={20} height={20} alt="" onLoad={event => { ratio.current = event.currentTarget.naturalWidth / (event.currentTarget.naturalHeight || 1); }} />
    </button>{label}
  </span>{shown.value && createPortal(<div id={id} className="generation-tag-preview" data-phase={shown.phase} inert={shown.phase === 'exit'} role="region" aria-label={label} style={{ left: position.left, top: position.top }} onMouseEnter={keepOpen} onMouseLeave={closeSoon}>
    <img src={shown.value} alt={label} style={{ height: position.height }} onLoad={event => { ratio.current = event.currentTarget.naturalWidth / (event.currentTarget.naturalHeight || 1); place(); }} />
  </div>, anchor.current?.closest('dialog') ?? document.body)}</>;
}
