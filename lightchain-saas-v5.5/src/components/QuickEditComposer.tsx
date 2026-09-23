import { imageBounds } from '../canvas-selection';
import { demoNotice } from '../demo-feedback';
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type Dispatch, type SetStateAction } from 'react';
import { createPortal } from 'react-dom';
import { AssetPicker } from './AssetPicker';
import type { EditRegion } from './LocalEditRegion';
import { GenerationSettings } from './GenerationSettings';
import { readImage } from '../readImage';
import type { LibraryImage } from '../asset-library';
import { useLocale } from '../LocaleContext';
import { usePresence } from '../usePresence';
import { type CanvasImage, useCanvas } from '../useCanvas';
import { Button, Divider, Icon, IconButton } from './ui';

export type CanvasEditTool = '局部修改' | '印花上身' | 'AI试衣';
type Reference = { id: string; name: string; url: string };
export type QuickEditDraft = { value: string; references: Reference[]; ratio: string; resolution: string; count: string; region?: EditRegion; printMode?: 'position' | 'repeat' };
export const createQuickEditDraft = (): QuickEditDraft => ({ value: '', references: [], ratio: 'auto', resolution: '2K', count: '1' });
export function QuickEditComposer({ board, image, phase, onClose, onSubmit, uploads, onUpload, draft, onDraftChange, generating = false, localEdit = false, tool = '局部修改', onAdjustPrint, onNotify }: {
  localEdit?: boolean; tool?: CanvasEditTool; onAdjustPrint?: (draft: QuickEditDraft) => void; onNotify: (message: string) => void;
  board: ReturnType<typeof useCanvas>; image: CanvasImage; phase: 'enter' | 'exit'; onClose: () => void;
  onSubmit: (request: string, draft: QuickEditDraft) => void; uploads: LibraryImage[]; onUpload: (image: LibraryImage) => void; generating?: boolean;
  draft: QuickEditDraft; onDraftChange: Dispatch<SetStateAction<QuickEditDraft>>;
}) {
  const { t, locale } = useLocale();
  const { value, references, ratio, resolution, count } = draft;
  const copy = locale === 'en' ? { title: 'Local edit', hint: 'Tell me what to change, e.g. make the collar a V-neck', draw: 'Draw edit area', done: 'Finish drawing', clear: 'Clear area', reference: 'Reference', close: 'Close local edit', source: 'Source image', generate: 'Generate' } : locale === 'ja' ? { title: '部分編集', hint: '変更内容を入力してください（例：襟をVネックに）', draw: '編集範囲を描画', done: '描画を完了', clear: '範囲をクリア', reference: '参考画像', close: '部分編集を閉じる', source: '元画像', generate: '生成' } : { title: '局部修改', hint: '告诉我你想怎么改，如：把领子变V领', draw: '绘制修改区域', done: '完成绘制', clear: '清除区域', reference: '参考图', close: '关闭局部修改', source: '原图', generate: '生成' };
  const printApply = localEdit && tool === '印花上身';
  const tryOn = localEdit && tool === 'AI试衣';
  const referenceLimit = printApply || tryOn ? 1 : 4;
  const referenceLabel = printApply ? t('印花') : tryOn ? t('模特') : copy.reference;
  const referenceLimitMessage = printApply ? t('最多添加1张印花图片') : tryOn ? t('最多添加1张模特图片') : t('最多添加4张参考图片');
  const toolTitle = localEdit ? t(tool) : t('快捷编辑');
  const canSubmit = tryOn ? references.length === 1 : !!value.trim();
  const [dock, setDock] = useState({ left: 16, width: 800 });
  const setValue = (value: string) => onDraftChange(previous => ({ ...previous, value }));
  const setReferences: Dispatch<SetStateAction<Reference[]>> = update => onDraftChange(previous => ({ ...previous, references: typeof update === 'function' ? update(previous.references) : update }));
  const setRatio = (ratio: string) => onDraftChange(previous => ({ ...previous, ratio }));
  const setResolution = (resolution: string) => onDraftChange(previous => ({ ...previous, resolution }));
  const setCount = (count: string) => onDraftChange(previous => ({ ...previous, count }));
  const [menu, setMenu] = useState<'settings' | 'model' | null>(null);
  const shownMenu = usePresence(menu);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerCapacity, setPickerCapacity] = useState(4);
  const shownPicker = usePresence(pickerOpen ? true : null);
  const modelAnchor = useRef<HTMLDivElement>(null);
  const modelInput = useRef<HTMLInputElement>(null);
  const settingsAnchor = useRef<HTMLDivElement>(null);
  const [error, setError] = useState('');
  const root = useRef<HTMLDivElement>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const active = useRef(true);
  const reading = useRef(false);
  const [height, setHeight] = useState(localEdit ? 280 : 140);
  const focusCompleted = useRef(false);
  const close = useRef(onClose); close.current = onClose;
  useLayoutEffect(() => {
    if (!localEdit || phase === 'exit') return;
    const { left, right } = board.editingViewport(true);
    const width = Math.min(800, Math.max(0, right - left));
    setDock({ left: (left + right - width) / 2, width });
    // The fixed composer overlaps the image bottom by 24px (88px dock inset minus 24px).
    return board.focusImage(image.id, (root.current?.offsetHeight ?? height) + 64, {
      animate: true,
      staged: !focusCompleted.current,
      onComplete: () => { focusCompleted.current = true; },
    });
  }, [localEdit, phase, image.id, height, board.size.width, board.size.height, board.editingViewport, board.focusImage]);
  // Focus once on entry. Subsequent camera, image and input changes only move the composer.
  useLayoutEffect(() => {
    if (localEdit || phase === 'exit') return;
    return board.focusImage(image.id, (root.current?.offsetHeight ?? 140) + 112, { animate: true, ignorePanels: false });
  }, [localEdit, phase, image.id, board.focusImage]);
  useEffect(() => { textarea.current?.focus({ preventScroll: true }); }, [localEdit]);
  useEffect(() => { active.current = phase === 'enter'; return () => { active.current = false; }; }, [phase]);
  useLayoutEffect(() => {
    const element = root.current; if (!element) return;
    const observer = new ResizeObserver(() => setHeight(element.offsetHeight)); observer.observe(element);
    return () => observer.disconnect();
  }, []);
  useLayoutEffect(() => { const element = textarea.current; if (element) { element.style.height = '64px'; element.style.height = `${Math.min(180, Math.max(64, element.scrollHeight))}px`; } }, [value]);
  useEffect(() => {
    const dismiss = (e: PointerEvent) => {
      if (!menu || (settingsAnchor.current?.contains(e.target as Node) || modelAnchor.current?.contains(e.target as Node))) return;
      setMenu(null);
      // Dismiss the nested menu before the canvas can clear the selected image and its editor.
      if (e.button === 0 && e.target === board.canvasRef.current) {
        e.preventDefault();
        e.stopPropagation();
        settingsAnchor.current?.querySelector<HTMLButtonElement>('button')?.focus({ preventScroll: true });
      }
    };
    const escape = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || document.querySelector('dialog[open]')) return;
      e.preventDefault(); e.stopImmediatePropagation();
      if (menu) { setMenu(null); if (menu === 'model') modelAnchor.current?.querySelector<HTMLButtonElement>('button')?.focus(); else textarea.current?.focus(); } else { close.current(); board.canvasRef.current?.focus(); }
    };
    window.addEventListener('pointerdown', dismiss, true); window.addEventListener('keydown', escape, true);
    return () => { window.removeEventListener('pointerdown', dismiss, true); window.removeEventListener('keydown', escape, true); };
  }, [menu, board.canvasRef]);
  useEffect(() => {
    if (menu === 'model') modelAnchor.current?.querySelector<HTMLButtonElement>('[role="menuitem"]')?.focus({ preventScroll: true });
  }, [menu]);
  const submit = () => {
    if (!canSubmit || generating || phase === 'exit') return;
    onSubmit([value.trim() || toolTitle, `${t('编辑图片')}：${image.name}`, ...references.map(ref => `${t('参考图片')}：${ref.name}`), `${ratio === 'auto' ? t('智能') : ratio} | ${resolution} | ${t('{count}张').replace('{count}', count)}`].join('\n'), draft);
  };
  const addFiles = async (files: FileList) => {
    if (reading.current) return;
    if (files.length + references.length > referenceLimit) { setError(referenceLimitMessage); return; }
    reading.current = true;
    try {
      const results = await Promise.allSettled(Array.from(files).map(readImage));
      const loaded = results.flatMap(result => result.status === 'fulfilled' ? [result.value] : []);
      if (!active.current) { loaded.forEach(item => URL.revokeObjectURL(item.url)); return; }
      loaded.forEach(onUpload);
      setReferences(previous => [...previous, ...loaded].slice(0, referenceLimit));
      setError(results.some(result => result.status === 'rejected') ? t('支持 JPG、PNG、WebP、SVG，单张图片不超过 20 MB') : '');
    } finally { reading.current = false; }
  };
  const confirmReferences = (items: Omit<CanvasImage, 'x' | 'y'>[]) => {
    setReferences(previous => [...previous, ...items.filter(item => !previous.some(ref => ref.url === item.url))].slice(0, referenceLimit));
    setPickerOpen(false); setError('');
  };
  const openReferences = () => {
    setMenu(null);
    if (references.length >= referenceLimit) { setError(referenceLimitMessage); return; }
    setPickerCapacity(referenceLimit - references.length); setPickerOpen(true);
  };
  const width = Math.min(480, Math.max(0, board.size.width - 32));
  const bounds = imageBounds(image);
  const left = (bounds.x + bounds.width / 2) * board.camera.zoom + board.camera.x - width / 2;
  const top = (bounds.y + bounds.height) * board.camera.zoom + board.camera.y + 24;
  return <><div ref={root} className={`quick-edit-composer ${localEdit ? 'local-edit-composer' : 'agent-composer'} ${printApply ? 'print-apply-composer' : tryOn ? 'try-on-composer' : ''}`} role="region" aria-label={toolTitle} data-canvas-ui data-workbench-menu data-phase={phase} inert={phase === 'exit'} style={(localEdit ? { left: dock.left, bottom: 88, width: dock.width } : { left, top, width }) as CSSProperties}>
    {localEdit && <header className="local-edit-header"><div className="local-edit-heading"><h2>{toolTitle}</h2>{printApply && <p className="tool-input-hint"><Icon name="tool-info" size={16} /><span>{t('服装建议为平铺图，若您的图片非平铺图，建议使用“转3D平铺”后再次使用')}</span></p>}</div><IconButton icon="close" size="m" aria-label={`${t('关闭')} ${toolTitle}`} onClick={onClose} /></header>}
    <div className={localEdit ? 'local-edit-input agent-composer' : 'quick-edit-input'}>
    {localEdit && <div className="local-edit-media" data-component="Canvas/ToolMediaRow">
      <div className="local-edit-image" data-component="Image/Asset" title={image.name}><img src={image.url} alt={copy.source} /></div>
      {references.map(ref => <div className="local-edit-image local-edit-reference" data-component="Upload/ImageTile" key={ref.id} title={ref.name}><img src={ref.url} alt={ref.name} /><IconButton variant="tonal" size="s" icon="close" aria-label={`${t('移除')} ${ref.name}`} onClick={() => setReferences(previous => previous.filter(item => item.id !== ref.id))} /></div>)}
      {references.length < referenceLimit && (tryOn ? <div className="model-upload-anchor" ref={modelAnchor}>
        <Button className="local-edit-upload" aria-label={t('添加模特图')} aria-haspopup="menu" aria-expanded={menu === 'model'} aria-controls="try-on-model-menu" onClick={() => setMenu(menu === 'model' ? null : 'model')}><Icon name="quick-edit-imgIcon" size={24} /><span>{referenceLabel}</span></Button>
        {shownMenu.value === 'model' && <div className="model-upload-menu" id="try-on-model-menu" onKeyDown={event => {
          const items = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="menuitem"]'));
          const index = items.indexOf(document.activeElement as HTMLButtonElement);
          const next = event.key === 'ArrowDown' ? (index + 1) % items.length : event.key === 'ArrowUp' ? (index + items.length - 1) % items.length : event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : -1;
          if (next >= 0) { event.preventDefault(); items[next]?.focus(); }
        }} role="menu" aria-label={t('添加模特图')} data-phase={shownMenu.phase} inert={shownMenu.phase === 'exit'}>
          <span className="model-upload-menu-title">{t('添加模特图')}</span>
          <Button role="menuitem" icon="upload" onClick={() => { setMenu(null); modelInput.current?.click(); }}>{t('本地上传')}</Button>
          <Button role="menuitem" onClick={() => { setMenu(null); onNotify(t('模特库选择将在后续 Demo 中演示')); }}>{t('模特库选择')}</Button>
        </div>}
      </div> : <Button className="local-edit-upload" aria-label={`${t('添加图片')} · ${referenceLabel}`} aria-haspopup="dialog" onClick={openReferences}><Icon name="quick-edit-imgIcon" size={24} /><span>{referenceLabel}</span></Button>)}
    </div>}
    {!localEdit && references.length > 0 && <div className="quick-edit-references">{references.map((ref, index) => <div className="quick-edit-chip" key={ref.id}><img src={ref.url} alt="" /><span title={ref.name}>{t('图片')}{index + 1}</span><Button aria-label={`${t('移除')} ${ref.name}`} onClick={() => { setReferences(prev => prev.filter(item => item.id !== ref.id)); setError(''); }}><Icon name="quick-edit-imgIconSystem" size={16} /></Button></div>)}</div>}
    {!printApply && <textarea ref={textarea} aria-label={t('设计需求')} placeholder={localEdit ? copy.hint : t('描述你想如何修改这张图片')} value={value} onChange={e => setValue(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); submit(); } }} onPaste={e => { if (e.clipboardData.files.length) { e.preventDefault(); void addFiles(e.clipboardData.files); } }} />}
    {error && <p className="quick-edit-error" role="status">{error}</p>}
    {printApply ? <div className="print-apply-footer">
      <div className="print-mode-switch" role="group" aria-label={t('印花方式')}>
        <Button aria-pressed={draft.printMode !== 'repeat'} onClick={() => onDraftChange(previous => ({ ...previous, printMode: 'position' }))}><Icon name="print-target-position-linear" size={16} />{t('指定位置')}</Button>
        <Button aria-pressed={draft.printMode === 'repeat'} onClick={() => onDraftChange(previous => ({ ...previous, printMode: 'repeat' }))}><Icon name="print-seamless-repeat" size={16} />{t('满印')}</Button>
      </div>
      <Button variant="primary" size="m" disabled={!references.length || generating} onClick={() => onAdjustPrint?.(draft)}>{t('调整印花位置')}</Button>
    </div> : <div className="quick-edit-footer">
      <div className="quick-edit-actions">
        {localEdit ? <Button icon="prop-imgNameInpaint" onClick={() => { setMenu(null); onNotify(demoNotice(locale)); }}>{copy.draw}</Button> : <IconButton size="m" icon="quick-edit-imgIcon" className="quick-edit-add" aria-label={t('添加图片')} aria-haspopup="dialog" onClick={openReferences} />}
        <Divider vertical />
        <div ref={settingsAnchor} className="quick-edit-menu-anchor"><Button className="quick-edit-settings-trigger" aria-haspopup="dialog" aria-controls="quick-edit-generation-settings" aria-label={t('生成设置')} aria-expanded={menu === 'settings'} onClick={() => setMenu(menu === 'settings' ? null : 'settings')}><Icon name={`parameter-${ratio.replace(':', '-')}`} size={20} /><span>{ratio === 'auto' ? t('智能') : ratio} ｜ {resolution} ｜ {t('{count}张').replace('{count}', count)}</span><Icon name="quick-edit-imgChevron" size={16} /></Button>
          {shownMenu.value === 'settings' && <GenerationSettings anchor={settingsAnchor} phase={shownMenu.phase} ratio={ratio} resolution={resolution} count={count} onRatioChange={setRatio} onResolutionChange={setResolution} onCountChange={setCount} />}

        </div>
      </div>
      <div className="quick-edit-submit"><span className="quick-edit-credits"><Icon name="quick-edit-imgIconSystem1" size={16} />{t('30 / 张')}</span><button className="agent-send" disabled={!canSubmit || generating} aria-label={localEdit ? copy.generate : t('发送设计需求')} data-tooltip={localEdit ? copy.generate : t('发送设计需求')} onClick={submit}><Icon name="quick-edit-imgIconGenerateStar" size={24} /></button></div>
    </div>}
    </div>
    {tryOn && <input ref={modelInput} hidden type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={event => { if (event.target.files?.length) void addFiles(event.target.files); event.target.value = ''; }} />}
  </div>
    {shownPicker.value && createPortal(<div onDragEnter={event => event.stopPropagation()} onDragOver={event => event.stopPropagation()} onDragLeave={event => event.stopPropagation()} onDrop={event => event.stopPropagation()}>
      <AssetPicker locale={locale} phase={shownPicker.phase} uploads={[...uploads, ...board.images]} onUpload={onUpload} maxCount={pickerCapacity} excludedUrls={references.map(ref => ref.url)} limitMessage={referenceLimitMessage} onConfirm={item => confirmReferences([item])} onConfirmBatch={confirmReferences} onClose={() => setPickerOpen(false)} />
    </div>, document.body)}
  </>;
}
