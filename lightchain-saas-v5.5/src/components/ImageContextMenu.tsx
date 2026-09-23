import { DownloadFormatOptions } from './DownloadFormatMenu';
import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react';
import { useCanvas } from '../useCanvas';
import { usePresence } from '../usePresence';
import { useLocale } from '../LocaleContext';
import { Icon } from './ui';

type Board = ReturnType<typeof useCanvas>;
export function ImageContextMenu({ board, onUpload }: { board: Board; onUpload: () => void }) {
  const { t, locale } = useLocale();
  const shown = usePresence(board.contextMenu);
  const [submenu, setSubmenu] = useState<'download' | 'order' | null>(null);
  const sub = usePresence(submenu);
  const root = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [subPosition, setSubPosition] = useState({ x: 0, y: 0, left: false });
  const close = () => board.setContextMenu(null);
  const width = locale === 'zh-CN' ? 224 : 280;
  const subWidth = sub.value === 'download' || locale === 'zh-CN' ? 144 : 208;
  const mac = /Mac|iPhone|iPad/.test(navigator.platform);
  const modifier = mac ? '⌘' : 'Ctrl';
  useLayoutEffect(() => {
    if (!shown.value || !root.current) return;
    const rect = root.current.getBoundingClientRect();
    setPosition({ x: Math.max(8, Math.min(shown.value.x, window.innerWidth - rect.width - 8)), y: Math.max(8, Math.min(shown.value.y, window.innerHeight - rect.height - 8)) });
  }, [shown.value, locale]);
  useEffect(() => {
    setSubmenu(null);
    if (!board.contextMenu) return;
    root.current?.querySelector<HTMLButtonElement>('button')?.focus({ preventScroll: true });
    const dismiss = (e: PointerEvent) => { if (!root.current?.contains(e.target as Node)) board.setContextMenu(null); };
    const resize = () => board.setContextMenu(null);
    window.addEventListener('pointerdown', dismiss);
    window.addEventListener('resize', resize);
    return () => { window.removeEventListener('pointerdown', dismiss); window.removeEventListener('resize', resize); };
  }, [board.contextMenu]);
  const perform = (action: () => void) => { action(); close(); board.canvasRef.current?.focus({ preventScroll: true }); };
  const openSub = (kind: 'download' | 'order', button: HTMLElement) => {
    const rect = button.getBoundingClientRect();
    const edge = root.current!.getBoundingClientRect();
    const targetWidth = kind === 'download' || locale === 'zh-CN' ? 144 : 208;
    const left = edge.right + targetWidth + 4 > window.innerWidth - 8;
    setSubPosition({ x: left ? edge.left - targetWidth - 4 : edge.right + 4, y: Math.max(8, Math.min(rect.top - 8, window.innerHeight - 168 - 8)), left });
    setSubmenu(kind);
  };
  const keys = (e: KeyboardEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (shown.value?.id && (e.metaKey || e.ctrlKey) && ['c', 'd', 'v'].includes(e.key.toLowerCase())) {
      e.preventDefault(); const key = e.key.toLowerCase(); perform(key === 'c' ? board.copySelected : key === 'd' ? board.duplicate : board.paste); return;
    }
    if (shown.value?.id && (e.key === 'Delete' || e.key === 'Backspace')) { e.preventDefault(); perform(board.removeSelected); return; }
    if (e.key === 'Escape') { e.preventDefault(); perform(() => {}); return; }
    if (e.key === 'Tab') { close(); return; }
    const target = e.target as HTMLElement;
    const menu = target.closest('[role="menu"]'); if (!menu) return;
    if (e.key === 'ArrowLeft' && menu !== root.current) { e.preventDefault(); setSubmenu(null); root.current?.querySelector<HTMLButtonElement>(`[data-sub="${submenu}"]`)?.focus(); return; }
    if (e.key === 'ArrowRight' && target.dataset.sub) { e.preventDefault(); openSub(target.dataset.sub as 'download' | 'order', target); requestAnimationFrame(() => root.current?.querySelector<HTMLButtonElement>('.image-context-submenu button')?.focus()); return; }
    if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) {
      e.preventDefault(); const buttons = Array.from(menu.querySelectorAll<HTMLButtonElement>('button')).filter(b => b.closest('[role="menu"]') === menu && !b.disabled);
      const index = buttons.indexOf(target as HTMLButtonElement);
      const next = e.key === 'Home' ? 0 : e.key === 'End' ? buttons.length - 1 : (index + (e.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length;
      buttons[next]?.focus();
    }
  };
  if (!shown.value) return null;
  if (shown.value.id === null) return <div ref={root} className="image-context-menu" role="menu" aria-label={t('上传图片')} data-canvas-ui data-workbench-menu data-phase={shown.phase} inert={shown.phase === 'exit'} style={{ left: position.x, top: position.y, width }} onKeyDown={keys} onContextMenu={event => event.preventDefault()}>
    <button type="button" role="menuitem" onClick={() => { close(); onUpload(); }}><Icon name="canvas-imgIconSystem5" size={20} /><span>{t('上传图片')}</span></button>
  </div>;
  const subTrigger = (kind: 'download' | 'order', label: string, icon: string) => <button type="button" role="menuitem" data-sub={kind} aria-haspopup="menu" aria-expanded={submenu === kind} onPointerEnter={e => openSub(kind, e.currentTarget)} onClick={e => openSub(kind, e.currentTarget)}><Icon name={icon} size={20} /><span>{t(label)}</span><Icon name="context-img" size={16} /></button>;
  const item = (label: string, icon: string, action: () => void, shortcut?: string) => <button type="button" role="menuitem" onPointerEnter={() => setSubmenu(null)} onFocus={() => setSubmenu(null)} onClick={() => perform(action)}><Icon name={icon} size={20} /><span>{t(label)}</span>{shortcut && <kbd>{shortcut}</kbd>}</button>;
  const index = board.images.findIndex(image => image.id === board.selected);
  return <div ref={root} className="image-context-menu" role="menu" aria-label={t('图片右键菜单')} data-canvas-ui data-workbench-menu data-phase={shown.phase} inert={shown.phase === 'exit'} style={{ left: position.x, top: position.y, width }} onKeyDown={keys} onContextMenu={e => e.preventDefault()}>
    {subTrigger('download', '下载', 'context-imgLeftIcon')}
    <div className="element-menu-divider" role="separator" />
    {subTrigger('order', '图层顺序', 'context-imgLeftIcon1')}
    {item('复制', 'context-imgLeftIcon2', board.copySelected, `${modifier} + C`)}
    {item('复制并粘贴', 'context-imgLeftIcon3', board.duplicate, `${modifier} + D`)}
    {item('设为项目封面', 'context-project-cover', () => board.setCover(shown.value!.id!))}
    <div className="element-menu-divider" role="separator" />
    {item('删除', 'context-imgLeftIcon5', board.removeSelected, '←/del')}
    {sub.value && <div className={`image-context-menu image-context-submenu ${sub.value === 'download' ? 'element-design-menu download-format-menu' : ''} ${subPosition.left ? 'opens-left' : ''}`} role="menu" aria-label={t(sub.value === 'download' ? '下载格式' : '图层顺序')} data-phase={sub.phase} inert={sub.phase === 'exit'} style={{ left: Math.max(8, subPosition.x), top: subPosition.y, width: subWidth }}>
      {sub.value === 'download' ? <DownloadFormatOptions onSelect={format => perform(() => { void board.downloadImage(format); })} /> : ([['front', '移到顶层'], ['up', '上移一层'], ['down', '下移一层'], ['back', '移到底层']] as const).map(([direction, label]) => <button type="button" role="menuitem" key={direction} disabled={direction === 'front' || direction === 'up' ? index === board.images.length - 1 : index <= 0} onClick={() => perform(() => board.reorder(direction))}>{t(label)}</button>)}
    </div>}
  </div>;
}
