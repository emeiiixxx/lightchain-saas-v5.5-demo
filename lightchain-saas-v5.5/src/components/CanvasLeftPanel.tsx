import { GenerationRecordTags } from './GenerationRecordTags';
import { recordHasPrompt } from '../generation-record-display';
import { TaskDetailPanel } from './TaskDetailPanel';
import { demoNotice } from '../demo-feedback';
import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { useLocale } from '../LocaleContext';
import { usePresence } from '../usePresence';
import { prepareMainImage, type LibraryImage } from '../asset-library';
import type { CanvasImage } from '../useCanvas';
import { Button, Dialog, Divider, Icon, IconButton } from './ui';
import { ProgressiveImage } from './ProgressiveImage';
import { GeneratingPlaceholder } from './GeneratingPlaceholder';
import { FullImageViewer } from './FullImageViewer';
import { createPortal } from 'react-dom';
import { PromptLibrary, SavePrompt } from './PromptLibrary';
import { useSavedPrompts } from '../useSavedPrompts';
import { TaskRecordMoreMenu } from './TaskRecordMoreMenu';
import { downloadRecordGroup } from '../download-record-group';

export type LeftPanelTab = 'layers' | 'assets' | 'history';
export type GenerationRecord = {
  supportsPrompt?: boolean; printMode?: 'position' | 'repeat';
  sourceId?: string;
  id: string; title: string; time: string; prompt?: string; pending?: boolean; generating?: boolean; failed?: boolean; ratio?: string; resolution?: string;
  tags: { label: string; image?: string }[];
  count?: number;
  resultHeight?: number;
  images: { url: string; height: number }[];
};
const tabs = [
  { value: 'layers', label: '图层', en: 'Layers', ja: 'レイヤー', icon: 'generation-record-imgDefaultIcon' },
  { value: 'assets', label: '资产', en: 'Assets', ja: '素材', icon: 'generation-record-imgDefaultIcon1' },
  { value: 'history', label: '任务', en: 'Tasks', ja: 'タスク', icon: 'generation-record-imgDefaultIcon2' },
] as const;

export function CanvasLeftPanel({ tab, hasSelectedElement, onTabChange, onClose, records, unread, uploads, onUpload, onNotify, onRegenerate, onDeleteRecord, onDeleteResult, layersDisabled = false }: {
  hasSelectedElement: boolean; layersDisabled?: boolean;
  tab: LeftPanelTab | null; onTabChange: (tab: LeftPanelTab) => void; onClose: () => void;
  records: GenerationRecord[]; unread: boolean; uploads: LibraryImage[]; onUpload: (image: LibraryImage) => void; onNotify: (message: string) => void;
  onRegenerate: (record: GenerationRecord) => void; onDeleteRecord: (id: string) => void; onDeleteResult: (id: string, index: number) => void;
}) {
  const { t, locale } = useLocale();
  const shown = usePresence(tab);
  const switcher = useRef<HTMLDivElement>(null);
  const [indicator, setIndicator] = useState<CSSProperties>({ visibility: 'hidden' });
  const { entries, store } = useSavedPrompts(onNotify);
  const [saveTarget, setSaveTarget] = useState<{ anchor: HTMLElement; content: string } | null>(null);
  const shownSave = usePresence(saveTarget);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const library = usePresence(libraryOpen ? true : null);
  const [preview, setPreview] = useState<{ image: CanvasImage; record: GenerationRecord; index: number } | null>(null);
  const shownPreview = usePresence(preview);
  const previewRequest = useRef(0);
  const [deleteTarget, setDeleteTarget] = useState<{ kind: 'record'; record: GenerationRecord } | { kind: 'image'; record: GenerationRecord; index: number } | null>(null);
  const shownDelete = usePresence(deleteTarget);
  useLayoutEffect(() => {
    const element = switcher.current;
    if (!element) return;
    const update = () => {
      const active = element.querySelector<HTMLButtonElement>('[aria-selected="true"]');
      if (active) setIndicator({ left: active.offsetLeft, top: active.offsetTop, width: active.offsetWidth, height: active.offsetHeight });
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    element.querySelectorAll('button').forEach(button => observer.observe(button));
    return () => observer.disconnect();
  }, [shown.value, locale]);
  const copyPrompt = async (text: string) => {
    try { await navigator.clipboard.writeText(text); onNotify('提示词已复制'); }
    catch { onNotify('复制失败，请重试'); }
  };
  const openImage = async (record: GenerationRecord, index: number, closeOnError = false) => {
    if (!record.images[index]) return;
    const url = record.images[index].url;
    const name = `${t(record.title)} ${index + 1}`;
    const request = ++previewRequest.current;
    try {
      const image = await prepareMainImage({ id: url, url, name });
      if (request === previewRequest.current) setPreview({ image: { ...image, x: 0, y: 0 }, record, index });
    } catch { if (request === previewRequest.current) { onNotify('图片加载失败，请重试'); if (closeOnError) setPreview(null); } }
  };
  const allRecords = records;
  const deleteRecord = (record: GenerationRecord) => {
    onDeleteRecord(record.id);
    if (preview?.record.id === record.id) { previewRequest.current++; setPreview(null); }
  };
  const deleteResult = (record: GenerationRecord, index: number) => {
    const current = allRecords.find(item => item.id === record.id);
    if (!current || !current.images[index]) return;
    const images = current.images.filter((_, imageIndex) => imageIndex !== index);
    onDeleteResult(record.id, index);
    // Keep the task and its original generation parameters; only remove this result.
    previewRequest.current++;
    if (!images.length) setPreview(null);
    else void openImage({ ...current, images }, Math.min(index, images.length - 1), true);
  };
  const downloadGroup = async (record: GenerationRecord) => {
    try { await downloadRecordGroup(record.images, t(record.title)); }
    catch { onNotify(t('下载失败，请重试。')); }
  };
  return <>
    {shown.value && <aside id="canvas-left-sidebar" className="canvas-left-panel" aria-label={t(tabs.find(item => item.value === shown.value)!.label)} data-canvas-ui data-node-id="66:4715" data-phase={shown.phase} inert={shown.phase === 'exit'} onKeyDown={event => { if (event.key === 'Escape' && !document.querySelector('dialog[open]')) { event.preventDefault(); event.stopPropagation(); onClose(); } }}>
      <header className="left-panel-header">
        <div ref={switcher} className="right-panel-switcher left-panel-switcher" role="tablist" aria-label={t('画布功能栏')}>
          <span className="switcher-indicator" style={indicator} aria-hidden="true" />
          {tabs.map(item => <button disabled={layersDisabled && item.value === 'layers'} key={item.value} id={`left-panel-tab-${item.value}`} type="button" role="tab" title={t(item.label)} aria-label={t(item.label)} aria-selected={shown.value === item.value} aria-controls="left-panel-content" tabIndex={shown.value === item.value ? 0 : -1} onClick={() => onTabChange(item.value)} onKeyDown={event => {
            if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
            event.preventDefault(); event.stopPropagation();
            const available = tabs.filter(tab => !layersDisabled || tab.value !== 'layers');
            const index = available.findIndex(tab => tab.value === item.value);
            const next = event.key === 'Home' ? 0 : event.key === 'End' ? available.length - 1 : (index + (event.key === 'ArrowLeft' ? -1 : 1) + available.length) % available.length;
            onTabChange(available[next].value); document.getElementById(`left-panel-tab-${available[next].value}`)?.focus();
          }}><Icon name={item.icon} size={16} /><span className="left-panel-tab-label">{locale === 'en' ? item.en : locale === 'ja' ? item.ja : item.label}</span>{item.value === 'history' && unread && <span className="tool-unread-dot" aria-hidden="true" />}</button>)}
        </div>
        <IconButton className="left-panel-close" size="l" icon="generation-record-imgIcon" aria-label={t('收起左侧栏')} onClick={onClose} />
      </header>
      <div id="left-panel-content" className="left-panel-content" role="tabpanel" aria-labelledby={`left-panel-tab-${shown.value}`}>
        {shown.value !== 'history' ? <div className="left-panel-placeholder">{shown.value === 'layers' && !hasSelectedElement ? t('暂无图层') : demoNotice(locale)}</div>  : !allRecords.length ? <div className="generation-record-empty" data-node-id="163:11702">
          <img src="/assets/task-record-empty.png" alt="" width={128} height={128} />
          <div className="generation-record-empty-copy"><h3>{t('暂无任务记录')}</h3><p>{t('上传图片开始你的设计')}</p></div>
        </div> : <div className="generation-record-list">
          {allRecords.map((record, index) => <article className="generation-record" key={record.id}>
            <div className="generation-record-info">
              <div className="generation-record-heading"><div className="generation-record-heading-text"><h3>{t(record.title)}</h3><time>{record.time}</time></div><TaskRecordMoreMenu canDownload={record.images.length > 0} canRegenerate={!record.generating && !record.pending} onDownload={() => void downloadGroup(record)} onRegenerate={() => onRegenerate(record)} onDelete={() => setDeleteTarget({ kind: 'record', record })} /></div>
              <GenerationRecordTags record={record} active={tab === 'history'} />
              {recordHasPrompt(record) && <div className="generation-record-prompt">
                <p>{t(record.prompt!)}</p>
                <div className="generation-record-actions">
                  <Button onClick={() => setLibraryOpen(true)}><Icon name="generation-record-imgLeftIcon" size={16} />{t('提示词库')}</Button><Divider vertical />
                  <Button aria-haspopup="dialog" aria-expanded={saveTarget?.content === t(record.prompt!)} onClick={event => setSaveTarget({ anchor: event.currentTarget, content: t(record.prompt!) })}><Icon name="generation-record-imgLeftIcon1" size={16} />{t('保存提示词')}</Button><Divider vertical />
                  <Button onClick={() => void copyPrompt(t(record.prompt!))}><Icon name="generation-record-imgLeftIcon2" size={16} />{t('复制')}</Button>
                </div>
              </div>}
            </div>
            {record.generating && <div className={`generation-record-images ${(record.count ?? 1) >= 4 ? 'generation-record-images--four' : ''}`}>
              {Array.from({ length: record.count ?? 1 }, (_, resultIndex) => <div className="generation-record-loading" key={resultIndex} style={{ height: record.resultHeight ?? 92 }}><GeneratingPlaceholder style={{ inset: 0 }} /></div>)}
            </div>}
            {!record.generating && !record.pending && !record.failed && !record.images.length && <p className="text-xs text-muted">{t('暂无结果图片')}</p>}
            {!!record.images.length && <div className={`generation-record-images ${record.images.length >= 4 ? 'generation-record-images--four' : ''}`}>
              {record.images.map((item, imageIndex) => <button key={`${item.url}-${imageIndex}`} type="button" aria-label={`${t('查看大图')} · ${t(record.title)} ${imageIndex + 1}`} style={{ height: item.height }} onClick={() => void openImage(record, imageIndex)}><ProgressiveImage src={item.url} alt="" eager={index === 0} /></button>)}
            </div>}
          </article>)}
        </div>}
      </div>
    </aside>}
    {shownPreview.value && <FullImageViewer image={shownPreview.value.image} images={shownPreview.value.record.images.map((item, index) => ({ url: item.url, name: `${t(shownPreview.value!.record.title)} ${index + 1}` }))} selectedIndex={shownPreview.value.index} onSelect={index => void openImage(shownPreview.value!.record, index)} locale={locale} phase={shownPreview.phase} onClose={() => { previewRequest.current++; setPreview(null); }} details={<TaskDetailPanel record={shownPreview.value.record} selectedIndex={shownPreview.value.index} active={shownPreview.phase !== 'exit'} onSelect={index => void openImage(shownPreview.value!.record, index)} onLibrary={() => setLibraryOpen(true)} onSave={(anchor, content) => setSaveTarget({ anchor, content })} onCopy={text => void copyPrompt(text)} onNotify={onNotify} onRegenerate={() => { onRegenerate(shownPreview.value!.record); previewRequest.current++; setPreview(null); }} onDeleteImage={() => setDeleteTarget({ kind: 'image', record: shownPreview.value!.record, index: shownPreview.value!.index })} />} />}
    {shownDelete.value && createPortal(<Dialog title={t('删除确认')} className="task-delete-dialog" closeIcon="task-delete-close" phase={shownDelete.phase} onClose={() => setDeleteTarget(null)}><p className="task-delete-dialog-description">{t(shownDelete.value.kind === 'image' ? '删除当前图片后不可恢复，是否确认删除？' : '删除后不可恢复，是否确认删除？')}</p><footer className="task-delete-dialog-actions"><Button size="m" variant="secondary" onClick={() => setDeleteTarget(null)}>{t('取消')}</Button><Button size="m" variant="danger" onClick={() => { const target = shownDelete.value!; if (target.kind === 'image') deleteResult(target.record, target.index); else deleteRecord(target.record); setDeleteTarget(null); }}>{t('确认删除')}</Button></footer></Dialog>, document.body)}
    {library.value && createPortal(<PromptLibrary phase={library.phase} entries={entries} uploads={uploads} onUpload={onUpload} onStore={store} onNotify={onNotify} onClose={() => setLibraryOpen(false)} />, document.body)}
    {shownSave.value && createPortal(<SavePrompt anchor={shownSave.value.anchor} phase={shownSave.phase} onClose={() => setSaveTarget(null)} onSave={async name => {
      const result = await store([{ id: crypto.randomUUID(), name, content: shownSave.value!.content }, ...entries]);
      if (result.ok) { setSaveTarget(null); onNotify('提示词已保存'); } else { onNotify(result.message); }
    }} />, shownSave.value.anchor.closest('dialog') ?? document.body)}
  </>;
}
