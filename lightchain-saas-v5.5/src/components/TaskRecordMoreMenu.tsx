import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { useLocale } from '../LocaleContext';
import { usePresence } from '../usePresence';
import { useHoverDismiss } from '../useHoverDismiss';
import { type DownloadFormat } from '../download-image';
import { DownloadFormatOptions } from './DownloadFormatMenu';
import { Button, Icon, IconButton } from './ui';

export function TaskRecordMoreMenu({ detail = false, canDownload = false, canRegenerate = true, onDownload, onRegenerate, onDelete }: {
  detail?: boolean; canDownload?: boolean; canRegenerate?: boolean;
  onDownload?: (format: DownloadFormat) => void; onRegenerate?: () => void; onDelete: () => void;
}) {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const [downloadOpen, setDownloadOpen] = useState(false);
  const shown = usePresence(open ? true : null);
  const shownDownload = usePresence(open && downloadOpen ? true : null);
  const downloadHover = useHoverDismiss(open && downloadOpen, () => setDownloadOpen(false));
  const anchor = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const submenu = useRef<HTMLDivElement>(null);
  const id = useId();
  const downloadId = `${id}-formats`;
  const downloadTrigger = () => panel.current?.querySelector<HTMLButtonElement>('[data-task-download]');
  useEffect(() => { if (!open) setDownloadOpen(false); }, [open]);
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !anchor.current?.contains(event.target) && !panel.current?.contains(event.target) && !submenu.current?.contains(event.target)) setOpen(false);
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
  useLayoutEffect(() => {
    if (!shownDownload.value || !submenu.current) return;
    const element = submenu.current;
    element.showPopover();
    let frame = 0;
    const position = () => {
      const parent = panel.current?.getBoundingClientRect();
      const row = downloadTrigger()?.getBoundingClientRect();
      if (!parent || !row) return;
      const right = parent.right - 4;
      const flip = right + element.offsetWidth > innerWidth - 8;
      const left = `${Math.max(8, flip ? parent.left - element.offsetWidth + 4 : right)}px`;
      const top = `${Math.max(8, Math.min(row.top - 8, innerHeight - element.offsetHeight - 8))}px`;
      if (element.style.left !== left) element.style.left = left;
      if (element.style.top !== top) element.style.top = top;
      frame = requestAnimationFrame(position);
    };
    position();
    return () => { cancelAnimationFrame(frame); if (element.matches(':popover-open')) element.hidePopover(); };
  }, [shownDownload.value]);
  const choose = (action: () => void) => { downloadHover.cancel(); setDownloadOpen(false); setOpen(false); action(); };
  const openDownload = (focus = false) => {
    if (!canDownload) return;
    downloadHover.cancel(); setDownloadOpen(true);
    if (focus) requestAnimationFrame(() => submenu.current?.querySelector('button')?.focus());
  };
  return <div ref={anchor} className={`task-record-more-anchor ${detail ? 'task-record-more-anchor--detail' : ''}`} data-task-record-more>
    <IconButton size={detail ? 'm' : 's'} icon={detail ? 'task-record-more-detail' : 'task-record-more-list'} aria-label={t('更多')} aria-haspopup="menu" aria-controls={id} aria-expanded={open} onClick={() => setOpen(value => !value)} onKeyDown={event => {
      if (!['ArrowDown', 'ArrowUp'].includes(event.key)) return;
      event.preventDefault();
      setOpen(true);
      requestAnimationFrame(() => { const items = panel.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'); items?.[event.key === 'ArrowUp' ? items.length - 1 : 0]?.focus(); });
    }} />
    {shown.value && <div ref={panel} id={id} popover="manual" role="menu" aria-label={t('更多')} className="element-design-menu task-record-more-menu" data-phase={shown.phase} inert={shown.phase === 'exit'} onPointerEnter={downloadHover.cancel} onPointerLeave={event => {
      if (!(event.relatedTarget instanceof Node) || !submenu.current?.contains(event.relatedTarget)) downloadHover.schedule();
    }} onKeyDown={event => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); setOpen(false); anchor.current?.querySelector('button')?.focus(); return; }
      if (event.key === 'ArrowRight' && event.target === downloadTrigger()) { event.preventDefault(); event.stopPropagation(); openDownload(true); return; }
      if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault(); event.stopPropagation();
      const items = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>(':scope > button:not(:disabled)'));
      const index = items.indexOf(event.target as HTMLButtonElement);
      items[event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length]?.focus();
    }}>
      {!detail && <>
        <Button role="menuitem" data-task-download disabled={!canDownload} aria-haspopup="menu" aria-expanded={open && downloadOpen} aria-controls={downloadId} onPointerEnter={() => openDownload()} onClick={() => openDownload(true)}><Icon name="task-record-download" size={20} /><span>{t('下载该组结果图')}</span><Icon name="menu-41-2700-imgStyleLinearNameChevronRight" size={16} /></Button>
        <Button role="menuitem" disabled={!canRegenerate} onPointerEnter={() => setDownloadOpen(false)} onFocus={() => setDownloadOpen(false)} onClick={() => onRegenerate && choose(onRegenerate)}><Icon name="task-record-regenerate" size={20} /><span>{t('再次生成')}</span></Button>
      </>}
      <Button role="menuitem" onPointerEnter={() => setDownloadOpen(false)} onFocus={() => setDownloadOpen(false)} onClick={() => choose(onDelete)}><Icon name="task-record-delete" size={20} /><span>{t(detail ? '删除' : '删除此条记录')}</span></Button>
    </div>}
    {shownDownload.value && <div ref={submenu} id={downloadId} popover="manual" role="menu" aria-label={t('下载该组结果图')} className="element-design-menu task-record-format-menu" data-phase={shownDownload.phase} inert={shownDownload.phase === 'exit'} onPointerEnter={downloadHover.cancel} onPointerLeave={event => {
      if (!(event.relatedTarget instanceof Node) || (!panel.current?.contains(event.relatedTarget) && !event.currentTarget.contains(event.relatedTarget))) downloadHover.schedule();
    }} onKeyDown={event => {
      if (event.key === 'Escape' || event.key === 'ArrowLeft') { event.preventDefault(); event.stopPropagation(); setDownloadOpen(false); downloadTrigger()?.focus(); return; }
      if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault(); event.stopPropagation();
      const items = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>(':scope > button'));
      const index = items.indexOf(event.target as HTMLButtonElement);
      items[event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length]?.focus();
    }}><DownloadFormatOptions onSelect={format => onDownload && choose(() => onDownload(format))} /></div>}
  </div>;
}
