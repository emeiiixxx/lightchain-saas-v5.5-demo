import { PrintPlacementDialog } from './PrintPlacementDialog';
import { CanvasMinimap } from './CanvasMinimap';
import { TaskFeatureTip } from './TaskFeatureTip';
import { DownloadFormatMenu } from './DownloadFormatMenu';
import { ElementSendMenu } from './ElementSendMenu';
import { demoNotice } from '../demo-feedback';
import type { LibraryImage } from '../asset-library';
import { useLocale } from '../LocaleContext';
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react';
import { Button, Divider, Icon } from './ui';
import { usePresence } from '../usePresence';
import { ElementMenu } from './ElementMenu';
import { FullImageViewer } from './FullImageViewer';
import { ImageContextMenu } from './ImageContextMenu';
import { ShortcutsPanel } from './ShortcutsPanel';
import { QuickEditComposer, createQuickEditDraft, type QuickEditDraft, type CanvasEditTool } from './QuickEditComposer';
import { StrokeColorPicker } from './StrokeColorPicker';
import { CanvasLeftPanel, type LeftPanelTab, type GenerationRecord } from './CanvasLeftPanel';
import { type CanvasImage, useCanvas } from '../useCanvas';
import { GeneratingPlaceholder } from './GeneratingPlaceholder';
import { prepareDemoResults } from '../demo-generation';
import { MultiSelectionControls } from './MultiSelectionControls';
import { canvasLayouts } from '../canvas-arrangement';
import { imageBounds } from '../canvas-selection';
import { canvasToolbarPosition, intersectsViewport, screenBounds } from '../canvas-toolbar';

type Board = ReturnType<typeof useCanvas>;
type Props = { board: Board; open: boolean; onOpenChange: (open: boolean) => void; phase: 'enter' | 'exit'; onUpload: () => void; onReplace: () => void; onHelp: () => void; onNotify: (message: string) => void; uploads: LibraryImage[]; onRememberUpload: (image: LibraryImage) => void };
function Tool({ id, icon, label, active, onClick, disabled, size = 20, unread = false }: { id?: string; icon: string; label: string; active?: boolean; onClick: () => void; disabled?: boolean; size?: number; unread?: boolean }) {
  return <Button id={id} aria-label={label} title={label} aria-pressed={active} className={`workbench-tool ${active ? 'is-active' : ''}`} disabled={disabled} onClick={onClick}><Icon name={icon} size={size} />{unread && <span className="tool-unread-dot" aria-hidden="true" />}</Button>;
}
function NumberField({ label, prefix, value, min, max, unit, begin, change, disabled }: { label: string; prefix?: string; value: number; min?: number; max?: number; unit?: string; disabled?: boolean; begin: () => void; change: (n: number) => void }) {
  return <label className="property-number">{prefix && <span>{prefix}</span>}<input disabled={disabled} aria-label={label} type="number" value={Math.round(value * 10) / 10} min={min} max={max} step="1" onFocus={begin} onChange={e => { const n = e.currentTarget.valueAsNumber; if (Number.isFinite(n)) change(Math.min(max ?? Infinity, Math.max(min ?? -Infinity, n))); }} onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }} />{unit && <span>{unit}</span>}</label>;
}
function SliderField({ label, value, max, unit, brand, begin, change }: { label: string; value: number; max: number; unit?: string; brand?: boolean; begin: () => void; change: (n: number) => void }) {
  const { t } = useLocale();
  return <div className="property-slider"><input type="range" aria-label={label} min="0" max={max} value={value} className={brand ? 'brand-range' : ''} style={{ '--range-progress': `${value / max * 100}%` } as CSSProperties} onPointerDown={begin} onKeyDown={e => { if (!e.repeat && ['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) begin(); }} onChange={e => change(Number(e.target.value))} /><NumberField label={`${label} ${t("数值")}`} value={value} min={0} max={max} unit={unit} begin={begin} change={change} /></div>;
}

function ImageProperties({ board, onReplace, onAction, rotationLocked, onNotify }: { board: Board; onReplace: () => void; onAction: (text: string) => void; rotationLocked: boolean; onNotify: (message: string) => void }) {
  const { t } = useLocale();
  if (board.selectedIds.length > 1) return <div className="properties-empty">{t('已选择')} {board.selectedIds.length} {t('张图片')}</div>;
  const item = board.images.find(i => i.id === board.selected);
  if (!item) return <div className="properties-empty">{t("选择画布中的图片，查看图层属性")}</div>;
  const update = (patch: Partial<CanvasImage>) => board.updateSelected(patch, false);
  const field = (label: string, key: 'x' | 'y' | 'width' | 'height', prefix: string) => <NumberField label={label} prefix={prefix} value={item[key]} min={key === 'width' || key === 'height' ? 1 : undefined} begin={board.beginEdit} change={n => update({ [key]: n })} />;
  return <div className="image-properties" key={item.id}>
    <div className="property-title"><h2 title={item.name}>{t("图片")}{board.images.indexOf(item) + 1}</h2><Button icon="prop-imgLeftIcon" onClick={onReplace}>{t("替换图片")}</Button></div>
    <div className="property-actions">{[['prop-imgNameInpaint', t("局部编辑")], ['prop-imgNameConvertTo3DTile', t("转3D平铺")], ['prop-imgNameImageEdit', t("图片编辑")]].map(([icon, label]) => <button key={label} onClick={() => onAction(label)}><Icon name={icon} size={16} /><span>{label}</span></button>)}</div>
    <Divider />
    <section className="property-section"><h3>{t("基础参数")}</h3>
      <div className="property-row"><span>{t("位置")}</span><div className="property-pair">{field(t("横坐标"), 'x', 'X')}{field(t("纵坐标"), 'y', 'Y')}</div></div>
      <div className="property-row"><span>{t("尺寸")}</span><div className="property-pair">{field(t("宽度"), 'width', 'W')}{field(t("高度"), 'height', 'H')}</div></div>
      <div className="property-row"><span>{t("变换")}</span><div className="property-pair"><div className="angle-field"><Icon name="prop-imgNameAngle" size={16} /><NumberField label={t("旋转角度")} disabled={rotationLocked} value={item.rotation ?? 0} unit="°" begin={board.beginEdit} change={rotation => update({ rotation })} /></div><div className="property-group"><Tool label={t("水平翻转")} icon="prop-imgIcon1" active={item.flipX} onClick={() => board.updateSelected({ flipX: !item.flipX })} /><Divider vertical /><Tool label={t("垂直翻转")} icon="prop-imgIcon2" active={item.flipY} onClick={() => board.updateSelected({ flipY: !item.flipY })} /></div></div></div>
    </section><Divider />
    <section className="property-section"><h3>{t("圆角")}</h3><div className="property-row"><span>{t("圆角半径")}</span><SliderField label={t("圆角半径")} value={Math.min(100, item.radius ?? 0)} max={100} brand begin={board.beginEdit} change={radius => update({ radius })} /></div></section><Divider />
    <section className="property-section"><h3>{t("描边")}</h3>
      <div className="property-row"><span>{t("颜色")}</span><StrokeColorPicker color={item.stroke} opacity={item.strokeOpacity} onBegin={board.beginEdit} onChange={update} onNotify={onNotify} /></div>
      <div className="property-row"><span>{t("粗细")}</span><SliderField label={t("描边粗细")} value={item.strokeWidth ?? 0} max={100} brand begin={board.beginEdit} change={strokeWidth => update({ strokeWidth })} /></div>
      <div className="property-row"><span>{t("效果")}</span><div className="property-pair"><div className="property-group">{(['solid', 'dashed', 'dotted'] as const).map((style, i) => <Tool key={style} label={[t("实线"), t("虚线"), t("点线")][i]} icon={`prop-imgIcon${i + 4}`} active={item.strokeStyle === style} onClick={() => board.updateSelected({ strokeStyle: style })} />)}</div><div className="property-group">{(['inside', 'center', 'outside'] as const).map((align, i) => <Tool key={align} label={[t("内描边"), t("居中描边"), t("外描边")][i]} icon={`prop-imgIcon${i + 7}`} active={item.strokeAlign === align} onClick={() => board.updateSelected({ strokeAlign: align })} />)}</div></div></div>
    </section><Divider />
    <section className="property-section"><h3>{t("外观")}</h3><div className="property-row"><span>{t("不透明度")}</span><SliderField label={t("不透明度")} value={item.opacity ?? 100} max={100} unit="%" brand begin={board.beginEdit} change={opacity => update({ opacity })} /></div></section>
  </div>;
}

export function Workbench({ board, open, onOpenChange, phase, onUpload, onReplace, onHelp, onNotify, uploads, onRememberUpload }: Props) {
  const { t, locale } = useLocale();
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [toolbarSize, setToolbarSize] = useState({ width: 700, height: 42 });
  const bottomToolsRef = useRef<HTMLDivElement>(null);
  const zoomToolsRef = useRef<HTMLDivElement>(null);
  const [bottomToolsSize, setBottomToolsSize] = useState({ bottom: 0, zoom: 0 });
  const [tab, setTab] = useState<'agent' | 'properties'>('agent');
  const [prompt, setPrompt] = useState('');
  const [attachments, setAttachments] = useState<{ id: string; file: File; kind: 'file' | 'image' }[]>([]);
  const fileInput = useRef<HTMLInputElement>(null);
  const imageInput = useRef<HTMLInputElement>(null);
  const addAttachments = (input: HTMLInputElement, kind: 'file' | 'image') => {
    const files = Array.from(input.files ?? []).filter(file => kind === 'file' || file.type.startsWith('image/'));
    setAttachments(prev => [...prev, ...files.map(file => ({ id: crypto.randomUUID(), file, kind }))]);
    input.value = '';
    textarea.current?.focus();
  };
  const [conversation, setConversation] = useState<string[]>([]);
  const [savedConversations, setSavedConversations] = useState<string[][]>([]);
  const [menu, setMenu] = useState<string | null>(null);
  const [minimapOpen, setMinimapOpen] = useState(false);
  const shownMinimap = usePresence(minimapOpen && !board.locked ? true : null);
  const [hasUnreadGeneration, setHasUnreadGeneration] = useState(false);
  const [leftTab, setLeftTab] = useState<LeftPanelTab | null>(null);
  useLayoutEffect(() => {
    const bottom = bottomToolsRef.current;
    const zoom = zoomToolsRef.current;
    if (!bottom || !zoom) return;
    const update = () => setBottomToolsSize(previous => {
      const next = { bottom: bottom.offsetWidth, zoom: zoom.offsetWidth };
      return previous.bottom === next.bottom && previous.zoom === next.zoom ? previous : next;
    });
    const observer = new ResizeObserver(update);
    observer.observe(bottom);
    observer.observe(zoom);
    update();
    return () => observer.disconnect();
  }, []);
  let bottomToolsShift = 0;
  let bottomToolsBottom = 16;
  if (open && board.size.width > 1300 && bottomToolsSize.bottom && bottomToolsSize.zoom) {
    const centeredLeft = (board.size.width - bottomToolsSize.bottom) / 2;
    const leftLimit = leftTab ? 432 : 16;
    const rightLimit = board.size.width - 432 - bottomToolsSize.zoom - 16 - bottomToolsSize.bottom;
    if (rightLimit < leftLimit) bottomToolsBottom = 80;
    else bottomToolsShift = centeredLeft - Math.max(leftLimit, Math.min(centeredLeft, rightLimit));
  }
  const [generationRecords, setGenerationRecords] = useState<GenerationRecord[]>([]);
  const openLeftPanel = (value: LeftPanelTab) => { setLeftTab(value); if (value === 'history') setHasUnreadGeneration(false); else if (value === 'assets' || board.selectedIds.length > 0) onNotify(demoNotice(locale)); };
  // Demo submissions stand in for new generation records until generation is connected.
  const recordGenerationRequest = (request: string, title = "AI助手") => {
    setConversation(previous => [...previous, request]);
    const inputImage = board.images.find(image => image.id === board.selected);
    const now = new Date();
    const time = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    setGenerationRecords(previous => [{ id: crypto.randomUUID(), title, time, prompt: request, pending: true, tags: inputImage ? [{ label: '服装图', image: inputImage.url }] : [], images: [] }, ...previous]);
    setHasUnreadGeneration(leftTab !== 'history');
  };
  const [printPlacement, setPrintPlacement] = useState<{ source: CanvasImage; draft: QuickEditDraft } | null>(null);
  const shownPrintPlacement = usePresence(printPlacement);
  const [localEdit, setLocalEdit] = useState<string | null>(null);
  const [localEditTool, setLocalEditTool] = useState<CanvasEditTool>('局部修改');
  const [localEditDrafts, setLocalEditDrafts] = useState<Record<string, QuickEditDraft>>({});
  const closeLocalEdit = () => { setLocalEdit(null); board.setInteractionLocked(false); };
  const [quickEdit, setQuickEdit] = useState<string | null>(null);
  const shownElementToolbar = usePresence(!localEdit && !quickEdit ? board.selected : null);
  useEffect(() => {
    const toolbar = toolbarRef.current;
    if (!toolbar) return;
    const observer = new ResizeObserver(() => setToolbarSize({ width: toolbar.offsetWidth, height: toolbar.offsetHeight }));
    observer.observe(toolbar);
    return () => observer.disconnect();
  }, [board.selected, shownElementToolbar.value, shownElementToolbar.phase, locale]);
  useLayoutEffect(() => {
    board.setQuickEditing(quickEdit);
    return () => board.setQuickEditing(null);
  }, [quickEdit, board.setQuickEditing]);
  useEffect(() => { setQuickEdit(null); }, [board.blankClickVersion]);
  useLayoutEffect(() => {
    board.setIsolatedImageId(localEdit);
    return () => board.setIsolatedImageId(null);
  }, [localEdit, board.setIsolatedImageId]);
  // Keep each image's inputs for the canvas session, independently of menu visibility or submission.
  const [quickEditDrafts, setQuickEditDrafts] = useState<Record<string, QuickEditDraft>>({});
  const generationTimers = useRef(new Set<ReturnType<typeof setTimeout>>());
  const generatingSources = useRef(new Set<string>());
  const generationMounted = useRef(true);
  useEffect(() => {
    generationMounted.current = true;
    void prepareDemoResults().catch(() => { /* A submission can retry loading demo assets. */ });
    return () => {
      generationMounted.current = false;
      generationTimers.current.forEach(clearTimeout);
      generationTimers.current.clear();
    };
  }, []);
  const generateQuickEdit = async (request: string, draft: QuickEditDraft, sourceId: string, independent = false) => {
    const source = board.images.find(item => item.id === sourceId);
    if (!source || generatingSources.current.has(sourceId)) return;
    const count = Math.min(4, Math.max(1, Number(draft.count) || 1));
    const placeholders = board.beginGeneration(sourceId, count, draft.ratio);
    if (!placeholders.length) return;
    generatingSources.current.add(sourceId);
    const id = crypto.randomUUID();
    const now = new Date();
    const time = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const isPrint = independent && localEditTool === '印花上身';
    const supportsPrompt = !isPrint;
    setGenerationRecords(previous => [{ id, title: independent ? `款式 - ${localEditTool}` : '快捷编辑', time, supportsPrompt, printMode: isPrint ? (draft.printMode ?? 'position') : undefined, prompt: supportsPrompt ? (draft.value.trim() || undefined) : undefined, generating: true, count, resultHeight: 92 * placeholders[0].height / placeholders[0].width, ratio: draft.ratio, resolution: draft.resolution, tags: [{ label: '服装图', image: source.url }, ...draft.references.map(ref => ({ label: independent && localEditTool === 'AI试衣' ? '模特图' : independent && localEditTool === '印花上身' ? '印花图' : '参考图', image: ref.url })), ...(isPrint ? [{ label: draft.printMode === 'repeat' ? '满印' : '指定位置' }] : [])], images: [] }, ...previous]);
    if (!independent) setConversation(previous => [...previous, request]);
    setHasUnreadGeneration(leftTab !== 'history');
    setQuickEdit(null);
    // Insert beside the source and ease colliding content right; keep the viewport unchanged.
    if (independent) closeLocalEdit();
    // Decode in parallel with the demo delay, so loading starts immediately and lasts 3s.
    const delay = new Promise<void>(resolve => {
      const timer = setTimeout(() => { generationTimers.current.delete(timer); resolve(); }, 3000);
      generationTimers.current.add(timer);
    });
    try {
      const [assets] = await Promise.all([prepareDemoResults(), delay]);
      if (!generationMounted.current) return;
      const results = assets.slice(0, count);
      board.finishGeneration(placeholders.map(item => item.id), results);
      setGenerationRecords(previous => previous.map(record => record.id === id ? { ...record, generating: false, images: results.map((result, index) => ({ url: result.url, height: 92 * placeholders[index].height / placeholders[index].width })) } : record));
    } catch {
      if (!generationMounted.current) return;
      board.finishGeneration(placeholders.map(item => item.id), null);
      setGenerationRecords(previous => previous.map(record => record.id === id ? { ...record, generating: false, failed: true } : record));
      onNotify('图片加载失败，请重试');
    } finally {
      generatingSources.current.delete(sourceId);
    }
  };
  const quickEditVisible = usePresence(quickEdit === board.selected ? quickEdit : null);
  const rotationLocked = !!localEdit || !!quickEdit;
  useEffect(() => { setQuickEdit(null); }, [board.selected]);
  const [preview, setPreview] = useState(false);
  const shownPanel = usePresence(open ? true : null);
  const switcherRef = useRef<HTMLDivElement>(null);
  const [indicatorStyle, setIndicatorStyle] = useState<CSSProperties>({ visibility: 'hidden' });
  useLayoutEffect(() => {
    const switcher = switcherRef.current;
    if (!switcher) return;
    const updateIndicator = () => {
      const active = switcher.querySelector<HTMLButtonElement>('[aria-selected="true"]');
      if (!active) return;
      setIndicatorStyle({ left: active.offsetLeft, top: active.offsetTop, width: active.offsetWidth, height: active.offsetHeight });
    };
    updateIndicator();
    const observer = new ResizeObserver(updateIndicator);
    observer.observe(switcher);
    switcher.querySelectorAll('button').forEach(button => observer.observe(button));
    return () => observer.disconnect();
  }, [shownPanel.value, tab, locale]);
  const shownMenu = usePresence(menu);
  const zoomPercent = Math.round(board.camera.zoom * 100);
  const zoomOptions = [...new Set([10, 30, 50, 100, 200, zoomPercent])].sort((a, b) => a - b);
  const shownPreview = usePresence(preview ? true : null);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const selected = board.images.find(i => i.id === board.selected);
  const selectedInView = !!selected && intersectsViewport(screenBounds(imageBounds(selected), board.camera), board.size);
  const noContentInView = board.images.length > 0 && !board.images.some(item => intersectsViewport(screenBounds(imageBounds(item), board.camera), board.size));
  const returnHint = usePresence(noContentInView && !localEdit ? true : null);
  useEffect(() => { if (selected && !selectedInView) setMenu(null); }, [selectedInView, selected?.id]);
  const transform = useRef<{ item: CanvasImage; x: number; y: number; handle: string; angle: number } | null>(null);
  useEffect(() => { const close = (e: PointerEvent) => { if (!(e.target instanceof Element) || !e.target.closest('[data-workbench-menu]')) setMenu(null); }; const escape = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenu(null); }; window.addEventListener('pointerdown', close); window.addEventListener('keydown', escape); return () => { window.removeEventListener('pointerdown', close); window.removeEventListener('keydown', escape); }; }, []);
  const action = (text: string) => { setTab('agent'); onOpenChange(true); setPrompt(text); setMenu(null); requestAnimationFrame(() => textarea.current?.focus()); };
  const toggleMenu = (name: string) => setMenu(menu === name ? null : name);
  const startTransform = (e: ReactPointerEvent<HTMLButtonElement>, handle: string) => {
    if (!selected || (handle === 'rotate' && rotationLocked)) return; e.preventDefault(); e.stopPropagation(); board.beginEdit(); e.currentTarget.setPointerCapture(e.pointerId);
    if (handle === 'rotate') e.currentTarget.dataset.rotating = 'true';
    const rect = board.canvasRef.current!.getBoundingClientRect();
    const cx = rect.left + (selected.x + selected.width / 2) * board.camera.zoom + board.camera.x, cy = rect.top + (selected.y + selected.height / 2) * board.camera.zoom + board.camera.y;
    transform.current = { item: selected, x: e.clientX, y: e.clientY, handle, angle: Math.atan2(e.clientY - cy, e.clientX - cx) };
  };
  const moveTransform = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const drag = transform.current; if (!drag) return;
    const item = drag.item, angle = (item.rotation ?? 0) * Math.PI / 180;
    if (drag.handle === 'rotate') {
      if (rotationLocked) return;
      const rect = board.canvasRef.current!.getBoundingClientRect(); const cx = rect.left + (item.x + item.width / 2) * board.camera.zoom + board.camera.x, cy = rect.top + (item.y + item.height / 2) * board.camera.zoom + board.camera.y;
      let rotation = (item.rotation ?? 0) + (Math.atan2(e.clientY - cy, e.clientX - cx) - drag.angle) * 180 / Math.PI;
      if (e.shiftKey) rotation = Math.round(rotation / 15) * 15;
      board.updateSelected({ rotation }, false); return;
    }
    const sx = (e.clientX - drag.x) / board.camera.zoom, sy = (e.clientY - drag.y) / board.camera.zoom;
    const dx = sx * Math.cos(angle) + sy * Math.sin(angle), dy = -sx * Math.sin(angle) + sy * Math.cos(angle);
    const h = drag.handle;
    let width = Math.max(8, item.width + (h.includes('r') ? dx : h.includes('l') ? -dx : 0));
    let height = Math.max(8, item.height + (h.includes('b') ? dy : h.includes('t') ? -dy : 0));
    if (e.shiftKey && h.length === 2) height = width * item.height / item.width;
    const ox = (width - item.width) / 2 * (h.includes('l') ? -1 : h.includes('r') ? 1 : 0), oy = (height - item.height) / 2 * (h.includes('t') ? -1 : h.includes('b') ? 1 : 0);
    board.updateSelected({ width, height, x: item.x + item.width / 2 + ox * Math.cos(angle) - oy * Math.sin(angle) - width / 2, y: item.y + item.height / 2 + ox * Math.sin(angle) + oy * Math.cos(angle) - height / 2 }, false);
  };
  const unavailable = () => onNotify(demoNotice(locale));
  const elementAction = (label: string, entry: string) => {
    if (label === '款式' && ['局部修改', '印花上身', 'AI试衣'].includes(entry) && selected) {
      setMenu(null); setQuickEdit(null);
      if (leftTab === 'layers') setLeftTab('history');
      setLocalEditTool(entry as CanvasEditTool); board.setInteractionLocked(true); setLocalEdit(selected.id);
      return;
    }
    action(t(entry));
  };
  const elementMenu = (label: string, icon: string) => <ElementMenu label={label} icon={icon} open={menu === label} onToggle={() => toggleMenu(label)} onClose={() => setMenu(null)} onAction={entry => elementAction(label, entry)} />;

  return <>
    {returnHint.value && <div className="canvas-return-hint" data-canvas-ui data-phase={returnHint.phase} inert={returnHint.phase === 'exit'}>
      <p role="status">{t('当前视窗没有内容，可点击按钮快速回到内容区域')}</p>
      <Button variant="primary" size="s" onClick={board.returnToContent}>{t('回到内容')}</Button>
    </div>}
    {board.images.filter(item => item.generating !== undefined).map(item => <GeneratingPlaceholder key={item.id} active={!!item.generating} zoom={board.camera.zoom} suspended={board.isolationActive} style={{ left: item.x * board.camera.zoom + board.camera.x, top: item.y * board.camera.zoom + board.camera.y, width: item.width * board.camera.zoom, height: item.height * board.camera.zoom, visibility: board.isolationActive ? 'hidden' : 'visible' }} />)}
    {board.marquee && <div className="canvas-marquee" aria-hidden="true" style={{ left: board.marquee.x * board.camera.zoom + board.camera.x, top: board.marquee.y * board.camera.zoom + board.camera.y, width: board.marquee.width * board.camera.zoom, height: board.marquee.height * board.camera.zoom }} />}
    {board.selectedIds.length > 1 && !board.marquee && <MultiSelectionControls key={board.selectedIds.join('|')} board={board} onNotify={onNotify} />}
    {!leftTab && <div className="left-tools wb-surface" data-canvas-ui data-phase="enter" role="toolbar" aria-label={t("画布功能栏")}>
      <Tool icon="canvas-imgIconEditor7" label={t("图层")} disabled={!!localEdit} size={24} onClick={() => openLeftPanel('layers')} />
      <Tool icon="canvas-imgIconSystem6" label={t("资产")} size={24} onClick={() => openLeftPanel('assets')} />
      <Tool id="canvas-task-entry" icon="canvas-imgIcon2" label={t("任务")} size={24} unread={hasUnreadGeneration} onClick={() => openLeftPanel('history')} />
    </div>}
    <CanvasLeftPanel layersDisabled={!!localEdit} tab={leftTab} hasSelectedElement={board.selectedIds.length > 0} onTabChange={openLeftPanel} onClose={() => setLeftTab(null)} records={generationRecords} unread={hasUnreadGeneration} uploads={uploads} onUpload={onRememberUpload} onNotify={onNotify} />
    <TaskFeatureTip expanded={!!leftTab} />
    <div ref={bottomToolsRef} className="bottom-tools wb-surface" data-canvas-ui data-phase={phase} role="toolbar" aria-label={t("画布工具栏")} style={{ '--bottom-tools-shift': `${bottomToolsShift}px`, '--bottom-tools-bottom': `${bottomToolsBottom}px` } as CSSProperties}>
      <Tool disabled={!!localEdit} icon="canvas-imgIconEditor" label={t("选择 V")} active={board.effectiveMode === 'select'} onClick={() => board.setMode('select')} /><Tool disabled={!!localEdit} icon="canvas-imgIconEditor1" label={t("抓手 H")} active={board.effectiveMode === 'hand'} onClick={() => board.setMode('hand')} />
      <Tool icon="canvas-imgIconEditor2" label={t("撤销")} disabled={!!localEdit || !board.canUndo} onClick={board.undo} /><Tool icon="canvas-imgIconEditor3" label={t("重做")} disabled={!!localEdit || !board.canRedo} onClick={board.redo} /><Divider vertical />
      <Tool disabled={!!localEdit} icon="canvas-imgIconEditor4" label={t("添加矩形")} onClick={unavailable} /><Tool disabled={!!localEdit} icon="canvas-imgIconEditor5" label={t("添加画框")} onClick={unavailable} /><Tool disabled={!!localEdit} icon="canvas-imgIconEditor6" label={t("添加文字")} onClick={unavailable} /><Tool disabled={!!localEdit} icon="canvas-imgIconSystem5" label={t("上传图片")} onClick={onUpload} /><Divider vertical /><Tool disabled={!!localEdit} icon="canvas-imgIconBusinessApparelDesign1" label={t("工艺单")} onClick={() => action(t("工艺单"))} />
    </div>
    <div ref={zoomToolsRef} className={`zoom-tools ${open ? 'with-panel' : ''}`} data-canvas-ui data-phase={phase}>
      <div className="zoom-pill wb-surface" data-workbench-menu><Tool icon="canvas-imgIconEditor8" label={t("缩小")} disabled={!!localEdit} onClick={() => board.zoomAt(board.camera.zoom / 1.2, undefined, { animate: true, duration: 200 })} /><Button className="zoom-trigger" disabled={!!localEdit} aria-haspopup="true" aria-expanded={menu === 'zoom'} aria-controls="canvas-zoom-menu" onClick={() => toggleMenu('zoom')}><span>{Math.round(board.camera.zoom * 100)}%</span><Icon name="zoom-chevron-up" size={16} /></Button><Tool icon="canvas-imgIconEditor9" label={t("放大")} disabled={!!localEdit} onClick={() => board.zoomAt(board.camera.zoom * 1.2, undefined, { animate: true, duration: 200 })} />{shownMenu.value === 'zoom' && <div id="canvas-zoom-menu" className="workbench-menu zoom-menu" data-phase={shownMenu.phase} inert={shownMenu.phase === 'exit'}>{zoomOptions.map(n => <button key={n} aria-pressed={n === zoomPercent} onClick={() => { board.zoomAt(n / 100, undefined, { animate: true }); setMenu(null); }}><span className="zoom-option-label">{n}%</span>{n === zoomPercent && <Icon name="check" size={16} />}</button>)}<button onClick={() => { board.fit({ animate: true }); setMenu(null); }}><span className="zoom-option-label">{t("适应屏幕")}</span></button></div>}</div>
      <div className="round-tool wb-surface canvas-arrange-control" data-workbench-menu>
        <Button className="workbench-tool" disabled={!!localEdit} aria-label={t('整理画布')} title={t('整理画布')} aria-haspopup="menu" aria-expanded={menu === 'arrange'} aria-controls="canvas-arrange-menu" onClick={() => toggleMenu('arrange')} onKeyDown={event => {
          if (!['ArrowUp', 'ArrowDown'].includes(event.key)) return;
          event.preventDefault(); setMenu('arrange'); requestAnimationFrame(() => document.querySelector<HTMLButtonElement>('#canvas-arrange-menu button')?.focus());
        }}><Icon name="canvas-arrange" size={24} /></Button>
        {shownMenu.value === 'arrange' && <div id="canvas-arrange-menu" className="element-design-menu canvas-arrange-menu" role="menu" aria-label={t('整理画布')} data-phase={shownMenu.phase} inert={shownMenu.phase === 'exit'} onKeyDown={event => {
          if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); setMenu(null); document.querySelector<HTMLButtonElement>('[aria-controls="canvas-arrange-menu"]')?.focus(); return; }
          if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
          event.preventDefault(); const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('button'));
          const index = buttons.indexOf(event.target as HTMLButtonElement);
          buttons[event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length]?.focus();
        }}>{canvasLayouts.map(layout => <Button key={layout.value} role="menuitem" onClick={() => { board.arrange(layout.value); setMenu(null); board.canvasRef.current?.focus({ preventScroll: true }); }}><span>{locale === 'en' ? layout.en : locale === 'ja' ? layout.ja : layout.label}</span></Button>)}</div>}
      </div>
      <div className="canvas-map-control">
        <div className="round-tool wb-surface"><Button className="workbench-tool" disabled={!!localEdit} aria-label={t('画布小地图')} aria-pressed={minimapOpen} aria-expanded={minimapOpen && !board.locked} aria-controls="canvas-minimap" onClick={() => setMinimapOpen(value => !value)}><Icon name="canvas-minimap" size={24} /></Button></div>
        {shownMinimap.value && <div id="canvas-minimap" className="canvas-minimap" data-phase={shownMinimap.phase} inert={shownMinimap.phase === 'exit'}>
          <CanvasMinimap images={board.images} view={board.camera} canvasSize={board.size} label={t('画布小地图')} viewportLabel={t('当前可视范围')} onNavigate={board.navigateMinimap} />
        </div>}
      </div>
      <div className="round-tool wb-surface"><Tool icon="canvas-imgIconSystem7" label={t("新手引导")} size={24} onClick={onHelp} /></div><div className="round-tool wb-surface shortcuts-anchor" data-workbench-menu><Button className="workbench-tool" aria-label={t("快捷键")} title={t("快捷键")} aria-expanded={menu === 'shortcuts'} aria-controls="canvas-shortcuts-panel" onClick={() => toggleMenu('shortcuts')}><Icon name="canvas-imgIconSystem8" size={24} /></Button>{shownMenu.value === 'shortcuts' && <ShortcutsPanel phase={shownMenu.phase} onClose={() => setMenu(null)} />}</div>
    </div>
    {selected && !board.marquee && <>
      <div className="element-selection" style={{ left: selected.x * board.camera.zoom + board.camera.x, top: selected.y * board.camera.zoom + board.camera.y, width: selected.width * board.camera.zoom, height: selected.height * board.camera.zoom, transform: `rotate(${selected.rotation ?? 0}deg)` }}>
        {['tl', 't', 'tr', 'l', 'r', 'bl', 'b', 'br', ...(quickEdit ? [] : ['rotate'])].map(handle => localEdit ? <span key={handle} className={`selection-handle handle-${handle}`} aria-hidden="true">{handle === 'rotate' && <Icon name="canvas-imgIcon0201" size={16} />}</span> : <button key={handle} data-canvas-ui className={`selection-handle handle-${handle}`} aria-label={handle === 'rotate' ? t("旋转图片") : t("调整图片尺寸")} onPointerDown={e => startTransform(e, handle)} onPointerMove={moveTransform} onPointerUp={e => { transform.current = null; delete e.currentTarget.dataset.rotating; }} onPointerCancel={e => { transform.current = null; delete e.currentTarget.dataset.rotating; }} onLostPointerCapture={e => { transform.current = null; delete e.currentTarget.dataset.rotating; }}>{handle === 'rotate' && <Icon name="canvas-imgIcon0201" size={16} />}</button>)}
      </div>
      {shownElementToolbar.value === selected.id && <div ref={toolbarRef} className="element-toolbar wb-surface" data-canvas-ui data-phase={shownElementToolbar.phase} inert={shownElementToolbar.phase === 'exit'} role="toolbar" aria-label={t("元素工具栏")} style={canvasToolbarPosition(imageBounds(selected), board.camera, board.size, toolbarSize, open ? 432 : 16)}>
        <Button icon="canvas-imgIconBusinessAi1" aria-expanded={quickEdit === selected.id} onClick={() => { setQuickEdit(quickEdit === selected.id ? null : selected.id); setMenu(null); }}>{t("快捷编辑")}</Button><Divider vertical />
        {elementMenu('款式', 'element-fashion')}{elementMenu('印花', 'element-pattern')}{elementMenu('面料', 'element-fabric')}{elementMenu('线稿', 'element-line')}
        <div className="element-menu-anchor" data-workbench-menu>
          <Button className="workbench-tool element-menu-trigger" aria-label={t("更多操作")} title={t("更多操作")} aria-haspopup="menu" aria-expanded={menu === 'more'} aria-controls="element-more-menu" onClick={() => toggleMenu('more')}><Icon name="element-more" size={20} /></Button>
          {shownMenu.value === 'more' && <div id="element-more-menu" className="element-design-menu element-more-menu" role="menu" aria-label={t("更多操作")} data-phase={shownMenu.phase} inert={shownMenu.phase === 'exit'}>
            {[t("高清放大"), t("一键去底"), t("智能抠图"), t("智能裁图"), t("AI扩图"), t("AI消除")].map((label, index) => <Button role="menuitem" key={label} onClick={() => action(label)}><Icon name={`menu-41-3399-imgLeftIcon${index || ''}`} size={20} /><span>{label}</span></Button>)}
          </div>}
        </div>
        <Divider vertical /><Button onClick={() => action(t("工艺单素材包"))}><Icon name="element-tech" size={20} />{t("工艺单")}</Button><Divider vertical /><Tool icon="element-preview" label={t("查看大图")} onClick={() => setPreview(true)} /><Tool icon="asset-center" label={t("收藏到资源库")} onClick={unavailable} /><DownloadFormatMenu withLabel={false} open={menu === 'download'} onToggle={() => toggleMenu('download')} onClose={() => setMenu(null)} onSelect={format => void board.downloadImage(format)} /><ElementSendMenu open={menu === 'send'} onToggle={() => toggleMenu('send')} onClose={() => setMenu(null)} onSend={unavailable} />
      </div>}
    </>}
    {shownPanel.value && <aside id="canvas-right-sidebar" className={`right-panel ${tab === 'properties' ? 'properties-panel' : ''}`} data-canvas-ui data-phase={shownPanel.phase} inert={shownPanel.phase === 'exit'}>
      <header className="right-panel-header"><div ref={switcherRef} className="right-panel-switcher" role="tablist" aria-label={t("右侧面板")}><span className="switcher-indicator" style={indicatorStyle} aria-hidden="true" />{(['agent', 'properties'] as const).map((value, i) => <button key={value} role="tab" id={`panel-tab-${value}`} aria-controls="right-panel-content" aria-selected={tab === value} tabIndex={tab === value ? 0 : -1} onClick={() => setTab(value)} onKeyDown={e => { if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) { e.preventDefault(); const next = tab === 'agent' ? 'properties' : 'agent'; setTab(next); document.getElementById(`panel-tab-${next}`)?.focus(); } }}><Icon name={i ? 'prop-imgLeftSlot1' : 'prop-imgLeftSlot'} size={16} />{i ? t("图层属性") : t("AI助手")}</button>)}</div><Tool icon="sidebar" label={t("收起右侧栏")} size={24} onClick={() => onOpenChange(false)} /></header>
      <div id="right-panel-content" role="tabpanel" aria-labelledby={`panel-tab-${tab}`} className="right-panel-content">
        {tab === 'properties' ? <div inert={!!localEdit}><ImageProperties board={board} onNotify={onNotify} rotationLocked={rotationLocked} onReplace={onReplace} onAction={entry => entry === t("局部编辑") ? elementAction("款式", "局部修改") : action(entry)} /></div> : <>
          <div className="conversation-bar" data-workbench-menu><Button aria-haspopup="menu" aria-controls="conversation-history-menu" aria-expanded={menu === 'conversations'} onClick={() => toggleMenu('conversations')}>{t("新对话")}<Icon name="toolbar-2907-chevron-down" size={16} /></Button><Tool icon="canvas-imgIcon4" label={t("新建对话")} size={24} onClick={() => { if (conversation.length) setSavedConversations(prev => [...prev, conversation]); setConversation([]); setPrompt(''); setAttachments([]); }} />{shownMenu.value === 'conversations' && <div id="conversation-history-menu" className="element-design-menu conversation-history-menu" role="menu" aria-label={t("新对话")} data-phase={shownMenu.phase} inert={shownMenu.phase === 'exit'}>{savedConversations.length ? savedConversations.map((c, i) => <Button role="menuitem" key={i} onClick={() => { setConversation(c); setMenu(null); }}><span className="conversation-history-title">{c[0].slice(0, 25)}</span></Button>) : <p className="conversation-history-empty" role="status">{t("暂无历史对话")}</p>}</div>}</div>
          <div className="agent-content">{conversation.length ? conversation.map((text, i) => <div className="agent-message" key={i}><p>{text}</p><small>{t("已记录设计需求。当前为交互 Demo，暂未接入 AI 生成。")}</small></div>) : <><h2>{t("今天你想设计什么？")}</h2><p>{t("从下方输入你的设计需求，或上传/从画布中选择图片进行修改与设计")}</p><div className="agent-suggestions">{[t("多款融合"), t("面料套版"), t("单款裂变"), t("印花设计"), t("工艺单素材包")].map(text => <button key={text} onClick={() => action(text)}><span className="suggestion-idea"><Icon name="suggestion-idea" size={20} /></span><span className="suggestion-label">{text}</span><span className="suggestion-add"><Icon name="suggestion-add" size={20} /></span></button>)}</div></>}</div>
          <div className="agent-input-area"><div className="agent-composer">
            {attachments.length > 0 && <div className="agent-attachments">{attachments.map(item => <div className="agent-attachment-chip" key={item.id}><span className={`agent-attachment-icon agent-attachment-icon--${item.kind}`}><Icon name={`agent-add-${item.kind}`} size={16} /></span><span title={item.file.name}>{item.file.name}</span><Button aria-label={`${t("移除")} ${item.file.name}`} onClick={() => setAttachments(prev => prev.filter(a => a.id !== item.id))}><Icon name="close" size={12} /></Button></div>)}</div>}
            <textarea ref={textarea} aria-label={t("设计需求")} placeholder={t("上传产品图，然后向我说出设计需求")} value={prompt} onChange={e => setPrompt(e.target.value)} />
            <div className="agent-input-footer">
              <div className="agent-attachment-anchor" data-workbench-menu>
                <Button variant="outline" className="agent-add" onClick={() => toggleMenu('attachments')} aria-label={t("添加附件")} aria-haspopup="menu" aria-expanded={menu === 'attachments'} aria-controls="agent-attachment-menu"><Icon name="canvas-imgIcon5" size={24} /></Button>
                {shownMenu.value === 'attachments' && <div id="agent-attachment-menu" className="agent-attachment-menu" role="menu" aria-label={t("上传类型")} data-phase={shownMenu.phase} inert={shownMenu.phase === 'exit'}>
                  <button type="button" role="menuitem" onClick={() => { setMenu(null); fileInput.current?.click(); }}><span className="agent-attachment-icon agent-attachment-icon--file"><Icon name="agent-add-file" size={16} /></span><span>{t("文件")}</span></button>
                  <button type="button" role="menuitem" onClick={() => { setMenu(null); imageInput.current?.click(); }}><span className="agent-attachment-icon agent-attachment-icon--image"><Icon name="agent-add-image" size={16} /></span><span>{t("图片")}</span></button>
                </div>}
                <input ref={fileInput} hidden type="file" multiple aria-label={t("选择要上传的文件")} onChange={e => addAttachments(e.currentTarget, 'file')} />
                <input ref={imageInput} hidden type="file" accept="image/*" multiple aria-label={t("选择要上传的图片")} onChange={e => addAttachments(e.currentTarget, 'image')} />
              </div>
              <button className="agent-send" disabled={!prompt.trim() && !attachments.length} aria-label={t("发送设计需求")} data-tooltip={t("发送设计需求")} onClick={() => { recordGenerationRequest([prompt.trim(), ...attachments.map(item => `${t("附件：")}${item.file.name}`)].filter(Boolean).join('\n')); setPrompt(''); setAttachments([]); }}><span className="agent-send-glyph"><Icon name="agent-send-arrow" size={24} /></span></button>
            </div>
          </div></div>
        </>}
      </div>
    </aside>}
    {!localEdit && quickEditVisible.value && board.images.find(item => item.id === quickEditVisible.value) && <QuickEditComposer onNotify={onNotify} key={quickEditVisible.value} draft={quickEditDrafts[quickEditVisible.value] ?? createQuickEditDraft()} onDraftChange={update => {
      const imageId = quickEditVisible.value!;
      setQuickEditDrafts(previous => {
        const current = previous[imageId] ?? createQuickEditDraft();
        return { ...previous, [imageId]: typeof update === 'function' ? update(current) : update };
      });
    }} uploads={uploads} onUpload={onRememberUpload} board={board} image={board.images.find(item => item.id === quickEditVisible.value)!} phase={quickEditVisible.phase} onClose={() => setQuickEdit(null)} generating={generatingSources.current.has(quickEditVisible.value)} onSubmit={(request, draft) => { void generateQuickEdit(request, draft, quickEditVisible.value!); }} />}
    {localEdit && selected && <QuickEditComposer onNotify={onNotify} key={`local-${localEditTool}-${localEdit}`} localEdit tool={localEditTool} onAdjustPrint={draft => setPrintPlacement({ source: selected, draft })} draft={localEditDrafts[`${localEditTool}:${localEdit}`] ?? createQuickEditDraft()} onDraftChange={update => {
      const imageId = `${localEditTool}:${localEdit}`;
      setLocalEditDrafts(previous => {
        const current = previous[imageId] ?? createQuickEditDraft();
        return { ...previous, [imageId]: typeof update === 'function' ? update(current) : update };
      });
    }} uploads={uploads} onUpload={onRememberUpload} board={board} image={selected} phase="enter" onClose={closeLocalEdit} generating={generatingSources.current.has(localEdit)} onSubmit={(request, draft) => { void generateQuickEdit(request, draft, localEdit, true); }} />}
    {shownPrintPlacement.value && <PrintPlacementDialog source={shownPrintPlacement.value.source} draft={shownPrintPlacement.value.draft} phase={shownPrintPlacement.phase} onNotify={onNotify} onClose={() => setPrintPlacement(null)} onConfirm={() => {
      if (!printPlacement) return;
      const { source, draft } = printPlacement;
      const generationDraft = { ...draft, value: '' };
      setPrintPlacement(null);
      void generateQuickEdit(t('印花上身'), generationDraft, source.id, true);
    }} />}
    <ImageContextMenu board={board} onUpload={onUpload} />
    {shownPreview.value && selected && <FullImageViewer key={selected.id} image={selected} locale={locale} phase={shownPreview.phase} onClose={() => setPreview(false)} />}
  </>;
}
