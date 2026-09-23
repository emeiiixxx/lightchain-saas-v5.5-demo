import { useEffect, useRef, useState } from 'react';
import { useLocale } from '../LocaleContext';
import { readImage } from '../readImage';
import { Icon, IconButton } from './ui';

export function PromptCoverField({ value, onChange, onBusy, onNotify }: {
  value?: string; onChange: (url?: string) => void;
  onBusy: (busy: boolean) => void; onNotify: (message: string) => void;
}) {
  const { t } = useLocale();
  const input = useRef<HTMLInputElement>(null);
  const request = useRef(0);
  const emptyButton = useRef<HTMLButtonElement>(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const busyCallback = useRef(onBusy); busyCallback.current = onBusy;
  useEffect(() => () => { request.current++; busyCallback.current(false); }, []);
  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    if (files.length > 1) { onNotify('封面图仅支持上传1张图片'); return; }
    const file = files[0];
    const id = ++request.current;
    setBusy(true); onBusy(true);
    let objectUrl: string | undefined;
    try {
      const image = await readImage(file);
      objectUrl = image.url;
      // Persist the optional cover together with the prompt, rather than an expiring blob URL.
      const url = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('invalid_image'));
        reader.onerror = () => reject(reader.error);
        reader.onabort = () => reject(new Error('aborted'));
        reader.readAsDataURL(file);
      });
      if (request.current === id) onChange(url);
    } catch {
      if (request.current === id) onNotify('封面图上传失败，请使用20 MB以内的JPG、PNG、WebP或SVG图片');
    } finally {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      if (request.current === id) { setBusy(false); onBusy(false); }
    }
  };
  return <section className="prompt-cover-field" aria-label={t('封面图（非必填）')}>
    <div className="prompt-cover-label"><h3>{t('封面图')}</h3><p>{t('支持 JPG、PNG、WebP、SVG，单张图片不超过 20 MB')}</p></div>
    <input ref={input} hidden type="file" accept="image/jpeg,image/png,image/webp,image/svg+xml" aria-label={t('上传封面图')} onChange={event => { void upload(event.currentTarget.files); event.currentTarget.value = ''; }} />
    <div className={`prompt-cover-upload${dragging ? ' is-dragging' : ''}`} onDragOver={event => { if (event.dataTransfer.types.includes('Files')) { event.preventDefault(); event.stopPropagation(); setDragging(true); } }} onDragLeave={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false); }} onDrop={event => { event.preventDefault(); event.stopPropagation(); setDragging(false); void upload(event.dataTransfer.files); }}>
      {value ? <div className="prompt-cover-preview" data-has-cover="true" aria-busy={busy}>
        <img src={value} alt={t('封面图')} />
        <div className="prompt-cover-actions">
          <IconButton size="m" icon="prompt-cover-replace" aria-label={t('替换封面图')} disabled={busy} onClick={() => input.current?.click()}/>
          <IconButton size="m" icon="library-promptTrash" aria-label={t('移除封面图')} disabled={busy} onClick={() => { onChange(undefined); requestAnimationFrame(() => emptyButton.current?.focus()); }}/>
        </div>
      </div> : <button ref={emptyButton} type="button" className="prompt-cover-preview" aria-label={t('上传封面图')} disabled={busy} onClick={() => input.current?.click()}>
        <Icon name="library-cutoutPlus" size={24}/><span>{t('上传封面图')}</span>
      </button>}
      {busy && <p className="prompt-cover-status" role="status">{t('正在读取封面图')}</p>}
    </div>
  </section>;
}
