import { DownloadFormatMenu } from './DownloadFormatMenu';
import { exportImage, type DownloadFormat } from '../download-image';
import { prepareMainImage } from '../asset-library';
import { useEffect, useState } from 'react';
import type { GenerationRecord } from './CanvasLeftPanel';
import { useLocale } from '../LocaleContext';
import type { Notify } from '../notification';
import { demoNotice } from '../demo-feedback';
import { Button, Divider, Icon } from './ui';
import { ProgressiveImage } from './ProgressiveImage';
import { GenerationRecordTags } from './GenerationRecordTags';
import { recordHasPrompt } from '../generation-record-display';
import { ElementSendMenu } from './ElementSendMenu';
import { TaskRecordMoreMenu } from './TaskRecordMoreMenu';

type Props = {
  record: GenerationRecord; selectedIndex: number; active: boolean;
  onSelect: (index: number) => void; onLibrary: () => void;
  onSave: (anchor: HTMLElement, content: string) => void;
  onCopy: (text: string) => void; onNotify: Notify;
  onRegenerate: () => void; onDeleteImage: () => void;
};
export function TaskDetailPanel({ record, selectedIndex, active, onSelect, onLibrary, onSave, onCopy, onNotify, onRegenerate, onDeleteImage }: Props) {
  const { t, locale } = useLocale();
  const [sendOpen, setSendOpen] = useState(false);
  const [downloadOpen, setDownloadOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  useEffect(() => {
    if (!sendOpen && !downloadOpen) return;
    const outside = (event: PointerEvent) => { if (!(event.target instanceof Element) || !event.target.closest('[data-workbench-menu]')) { setSendOpen(false); setDownloadOpen(false); } };
    window.addEventListener('pointerdown', outside);
    return () => window.removeEventListener('pointerdown', outside);
  }, [sendOpen, downloadOpen]);
  useEffect(() => { setSendOpen(false); setDownloadOpen(false); }, [selectedIndex, active]);
  const unavailable = () => onNotify(demoNotice(locale));
  const download = async (format: DownloadFormat) => {
    const image = record.images[selectedIndex];
    if (!image || downloading) return;
    setDownloading(true);
    try {
      const name = `${t(record.title)}-${selectedIndex + 1}`;
      const loaded = await prepareMainImage({ id: image.url, url: image.url, name });
      await exportImage(loaded.image, name, format);
    } catch (error) { onNotify(error instanceof Error && error.message === '当前浏览器不支持此格式导出，请选择其他格式' ? t(error.message) : t('下载失败，请重试。'), 'error'); }
    finally { setDownloading(false); }
  };
  return <aside className="task-detail-panel" data-task-controls aria-label={locale === 'en' ? 'Task details' : locale === 'ja' ? 'タスク詳細' : '任务详情'}>
    <div className="task-detail-info">
      <header><div className="task-detail-heading-text"><h2>{t(record.title)}</h2><time>{record.time}</time></div><Button className="task-detail-regenerate" variant="outline" size="s" disabled={record.generating || record.pending} onClick={onRegenerate}><Icon name="task-record-regenerate-small" size={16} />{t('再次生成')}</Button></header>
      <nav className="task-detail-thumbnails" aria-label={t('图片缩略图')}>
        {record.images.map((image, index) => <button type="button" key={`${image.url}-${index}`} aria-label={`${t('查看大图')} · ${index + 1}`} aria-current={index === selectedIndex ? 'true' : undefined} onClick={() => onSelect(index)} onKeyDown={event => {
          if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;
          event.preventDefault(); event.stopPropagation();
          const step = event.key === 'ArrowLeft' ? -1 : event.key === 'ArrowRight' ? 1 : event.key === 'ArrowUp' ? -4 : 4;
          const next = event.key === 'Home' ? 0 : event.key === 'End' ? record.images.length - 1 : Math.max(0, Math.min(record.images.length - 1, index + step));
          onSelect(next); event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('button')[next]?.focus();
        }}><ProgressiveImage src={image.url} alt="" eager fit="cover" /></button>)}
      </nav>
      <GenerationRecordTags record={record} active={active} />
      {recordHasPrompt(record) && <div className="generation-record-prompt task-detail-prompt">
        <p>{t(record.prompt!)}</p>
        <div className="generation-record-actions">
          <Button onClick={onLibrary}><Icon name="generation-record-imgLeftIcon" size={16} />{t('提示词库')}</Button><Divider vertical />
          <Button onClick={event => onSave(event.currentTarget, t(record.prompt!))}><Icon name="generation-record-imgLeftIcon1" size={16} />{t('保存提示词')}</Button><Divider vertical />
          <Button onClick={() => onCopy(t(record.prompt!))}><Icon name="generation-record-imgLeftIcon2" size={16} />{t('复制')}</Button>
        </div>
      </div>}
    </div>
    <div className="task-detail-actions">
      <ElementSendMenu withLabel open={sendOpen} onToggle={() => { setDownloadOpen(false); setSendOpen(value => !value); }} onClose={() => setSendOpen(false)} onSend={unavailable} /><Divider vertical />
      <Button size="s" onClick={unavailable}><Icon name="asset-center" size={16} />{locale === 'en' ? 'Save to assets' : locale === 'ja' ? 'アセットに保存' : '收藏至资源库'}</Button><Divider vertical />
      <DownloadFormatMenu open={downloadOpen} disabled={downloading} onToggle={() => { setSendOpen(false); setDownloadOpen(value => !value); }} onClose={() => setDownloadOpen(false)} onSelect={format => void download(format)} /><Divider vertical />
      <TaskRecordMoreMenu detail onDelete={onDeleteImage} />
    </div>
  </aside>;
}
