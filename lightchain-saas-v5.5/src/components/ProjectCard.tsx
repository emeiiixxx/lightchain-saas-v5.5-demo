import { useEffect, useState } from 'react';
import { useLocale } from '../LocaleContext';
import { ProgressiveImage } from './ProgressiveImage';
import './project-card.css';

type Props = {
  name: string;
  coverUrl?: string;
  updatedAt: number;
  onNameChange: (name: string) => void;
  onOpen: () => void;
};

export function ProjectCard({ name, coverUrl, updatedAt, onNameChange, onOpen }: Props) {
  const { t, locale } = useLocale();
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  const minutes = Math.max(0, Math.floor((now - updatedAt) / 60_000));
  const amount = minutes < 60 ? minutes : minutes < 1440 ? Math.floor(minutes / 60) : Math.floor(minutes / 1440);
  const unit = minutes < 60 ? 'minute' : minutes < 1440 ? 'hour' : 'day';
  const ago = new Intl.RelativeTimeFormat(locale, { numeric: 'always' }).format(-amount, unit);
  const modified = minutes === 0
    ? locale === 'en' ? 'Edited just now' : locale === 'ja' ? 'たった今更新' : '刚刚修改'
    : locale === 'en' ? `Edited ${ago}` : locale === 'ja' ? `${ago}に更新` : `${ago}修改`;
  return <article className="project-card" data-node-id="150:8933">
    <button type="button" className="project-card-preview" aria-label={`${t('返回画布')} · ${name}`} onClick={onOpen}>
      {coverUrl && <ProgressiveImage src={coverUrl} alt={t('项目封面')} fit="cover" eager />}
    </button>
    <div className="project-card-info">
      <input className="project-card-name" aria-label={t('项目名称')} placeholder={t('重命名项目')} title={name} value={name} maxLength={80} onChange={event => onNameChange(event.target.value)} onBlur={event => onNameChange(event.currentTarget.value.trim() || 'Untitle')} onKeyDown={event => { if (event.key === 'Enter' && !event.nativeEvent.isComposing) event.currentTarget.blur(); }} />
      <time className="project-card-updated" dateTime={new Date(updatedAt).toISOString()} title={new Date(updatedAt).toLocaleString(locale)}>{modified}</time>
    </div>
  </article>;
}
