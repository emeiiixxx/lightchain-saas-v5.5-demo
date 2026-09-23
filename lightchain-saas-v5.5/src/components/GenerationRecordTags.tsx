import type { GenerationRecord } from './CanvasLeftPanel';
import { useLocale } from '../LocaleContext';
import { GenerationImageTag } from './GenerationImageTag';
import { recordDisplayTags } from '../generation-record-display';

export function GenerationRecordTags({ record, active = true }: { record: GenerationRecord; active?: boolean }) {
  const { t, locale } = useLocale();
  return <div className="generation-record-tags">
    {recordDisplayTags(record).map((tag, index) => tag.image
      ? <GenerationImageTag key={`${tag.label}-${index}`} src={tag.image} label={t(tag.label)} active={active} />
      : <span className="generation-record-tag" key={`${tag.label}-${index}`}>{t(tag.label)}</span>)}
    {!!record.count && <span className="generation-record-tag">{record.title.includes('款式裂变')
      ? (locale === 'en' ? 'Variations: ' : locale === 'ja' ? 'バリエーション数：' : '裂变数量：')
      : `${!record.ratio || record.ratio === 'auto' ? t('智能') : record.ratio} ｜ ${record.resolution ?? '2K'} ｜ `}{t('{count}张').replace('{count}', String(record.count))}</span>}
    {record.pending && <span className="generation-record-tag">{t('待生成')}</span>}
    {record.generating && <span className="generation-record-tag">{t('生成中…')}</span>}
    {record.failed && <span className="generation-record-tag">{t('图片加载失败，请重试')}</span>}
  </div>;
}
