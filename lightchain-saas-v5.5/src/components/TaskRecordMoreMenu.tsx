import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { useLocale } from '../LocaleContext';
import { usePresence } from '../usePresence';
import { Button, Icon, IconButton } from './ui';

export function TaskRecordMoreMenu({ detail = false, canDownload = false, canRegenerate = true, onDownload, onRegenerate, onDelete }: {
  detail?: boolean; canDownload?: boolean; canRegenerate?: boolean;
  onDownload?: () => void; onRegenerate?: () => void; onDelete: () => void;
}) {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const shown = usePresence(open ? true : null);
  const anchor = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const id = useId();
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !anchor.current?.contains(event.target) && !panel.current?.contains(event.target)) setOpen(false);
    };
    window.addEventListener('pointerdown', outside);
    return () => window.removeEventListener('pointerdown', outside);
  }, [open]);
  useLayoutEffect(() => {
    if (!shown.value || !panel.current) return;
    const element = panel.current;
    element.showPopover();
    let frame = 0;
    const position = () => {
      const rect = anchor.current?.getBoundingClientRect();
      if (!rect) return;
      const left = `${Math.max(8, Math.min(rect.right - element.offsetWidth, innerWidth - element.offsetWidth - 8))}px`;
      const below = rect.bottom + 8;
      const top = `${Math.max(8, below + element.offsetHeight <= innerHeight - 8 ? below : rect.top - element.offsetHeight - 8)}px`;
      if (element.style.left !== left) element.style.left = left;
      if (element.style.top !== top) element.style.top = top;
      frame = requestAnimationFrame(position);
    };
    position();
    return () => { cancelAnimationFrame(frame); if (element.matches(':popover-open')) element.hidePopover(); };
  }, [shown.value]);
  const choose = (action: () => void) => { setOpen(false); action(); };
  return <div ref={anchor} className={`task-record-more-anchor ${detail ? 'task-record-more-anchor--detail' : ''}`} data-task-record-more>
    <IconButton size={detail ? 'm' : 's'} icon={detail ? 'task-record-more-detail' : 'task-record-more-list'} aria-label={t('更多')} aria-haspopup="menu" aria-controls={id} aria-expanded={open} onClick={() => setOpen(value => !value)} onKeyDown={event => {
      if (!['ArrowDown', 'ArrowUp'].includes(event.key)) return;
      event.preventDefault();
      setOpen(true);
      requestAnimationFrame(() => { const items = panel.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'); items?.[event.key === 'ArrowUp' ? items.length - 1 : 0]?.focus(); });
    }} />
    {shown.value && <div ref={panel} id={id} popover="manual" role="menu" aria-label={t('更多')} className="element-design-menu task-record-more-menu" data-phase={shown.phase} inert={shown.phase === 'exit'} onKeyDown={event => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); setOpen(false); anchor.current?.querySelector('button')?.focus(); return; }
      if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault(); event.stopPropagation();
      const items = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'));
      const index = items.indexOf(event.target as HTMLButtonElement);
      items[event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length]?.focus();
    }}>
      {!detail && <>
        <Button role="menuitem" disabled={!canDownload} onClick={() => onDownload && choose(onDownload)}><Icon name="task-record-download" size={20} /><span>{t('下载该组结果图')}</span></Button>
        <Button role="menuitem" disabled={!canRegenerate} onClick={() => onRegenerate && choose(onRegenerate)}><Icon name="task-record-regenerate" size={20} /><span>{t('再次生成')}</span></Button>
      </>}
      <Button role="menuitem" onClick={() => choose(onDelete)}><Icon name="task-record-delete" size={20} /><span>{t(detail ? '删除' : '删除此条记录')}</span></Button>
    </div>}
  </div>;
}
