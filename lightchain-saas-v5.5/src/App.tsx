import { useLocale } from './LocaleContext';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Button, Dialog, Divider } from './components/ui';
import { useCanvas } from './useCanvas';
import { TopBar } from './components/TopBar';
import { DefaultPageUpload } from './components/DefaultPageUpload';
import { ProjectPanel } from './components/ProjectPanel';
import { usePresence } from './usePresence';
import { AssetPicker } from './components/AssetPicker';
import type { LibraryImage } from './asset-library';
import { Workbench } from './components/Workbench';
import type { CanvasImage } from './useCanvas';

export default function App() {
  const { t, locale } = useLocale();
  const [title, setTitle] = useState('Untitle');
  const [panel, setPanel] = useState(false);
  const [modal, setModal] = useState<'help' | 'support' | 'points' | 'project' | 'upload' | null>(null);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  useLayoutEffect(() => { document.documentElement.dataset.theme = theme; document.documentElement.style.colorScheme = theme; }, [theme]);
  const [toast, setToast] = useState('');
  const [uploads, setUploads] = useState<LibraryImage[]>([]);
  const uploadUrls = useRef(new Set<string>());
  useEffect(() => () => { uploadUrls.current.forEach(url => URL.revokeObjectURL(url)); }, []);
  const rememberUpload = (image: LibraryImage) => { uploadUrls.current.add(image.url); setUploads(previous => [image, ...previous]); };
  const [dragging, setDragging] = useState(false);
  const dragCount = useRef(0);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const notify = useCallback((message: string) => { setToast(t(message)); if (toastTimer.current) clearTimeout(toastTimer.current); toastTimer.current = setTimeout(() => setToast(''), 3500); }, [t]);
  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current); }, []);
  const board = useCanvas(notify, theme, locale);
  const replaceTarget = useRef<string | null>(null);
  const shownModal = usePresence(modal);
  const shownToast = usePresence(toast || null);
  const shownWelcome = usePresence(!board.images.length ? true : null);
  const shownToolbar = usePresence(board.images.length ? true : null);
  const shownDrop = usePresence(dragging && board.images.length ? true : null);
  const chooseFiles = () => { replaceTarget.current = null; setModal('upload'); };
  const replaceImage = () => { replaceTarget.current = board.selected; setModal('upload'); };
  const confirmImages = (items: Omit<CanvasImage, 'x' | 'y'>[]) => {
    if (replaceTarget.current && items[0]) { const item = items[0]; board.updateSelected({ image: item.image, url: item.url, name: item.name }); }
    else board.addImages(items);
    setModal(null);
  };

  return <div className="app-shell">
    <TopBar theme={theme} onThemeChange={setTheme} onModal={setModal} />
    <main className={`canvas-stage ${dragging ? 'is-dragging' : ''}`} aria-label={t("设计生产工作台")} onDragEnter={e => { if (!board.locked && e.dataTransfer.types.includes('Files')) { e.preventDefault(); dragCount.current++; setDragging(true); } }} onDragOver={e => { if (e.dataTransfer.types.includes('Files')) { e.preventDefault(); e.dataTransfer.dropEffect = board.locked ? 'none' : 'copy'; } }} onDragLeave={e => { if (e.dataTransfer.types.includes('Files')) { dragCount.current--; if (dragCount.current <= 0) setDragging(false); } }} onDrop={e => { e.preventDefault(); dragCount.current = 0; setDragging(false); if (board.locked) return; const r = e.currentTarget.getBoundingClientRect(); void board.upload(e.dataTransfer.files, board.images.length ? { x: e.clientX - r.left, y: e.clientY - r.top } : undefined); }}>
      <canvas ref={board.canvasRef} className={board.locked ? 'is-locked' : board.panning ? 'is-panning' : board.effectiveMode === 'hand' ? 'is-hand' : ''} tabIndex={0} aria-label={t("无限画布。拖动空白处框选，Shift 点选多张；空格拖动平移；按住 Control、Command 或 Option / Alt 滚轮缩放。")} />
      <ProjectPanel name={title} onNameChange={setTitle} onBack={() => setModal('project')} />
      {!panel && <Button className="sidebar-toggle" icon="sidebar" aria-label={panel ? t("收起右侧栏") : t("展开右侧栏")} title={panel ? t("收起右侧栏") : t("展开右侧栏")} aria-expanded={panel} aria-controls="canvas-right-sidebar" data-canvas-ui onClick={() => setPanel(true)} />}
      {shownWelcome.value && <section data-phase={shownWelcome.phase} inert={shownWelcome.phase === 'exit'} className="welcome" aria-label={t("开始设计")}>
        <h1>{t("Hello✨ 设计从这里开始")}</h1>
        <p>{t("请先点击下方上传线稿图 / 款式图 / 图案 / 面料图")}</p>
        <DefaultPageUpload dragging={dragging} onUpload={chooseFiles} />
      </section>}
      {shownDrop.value && <div data-phase={shownDrop.phase} className="drop-overlay">{t("松开，将图片添加到画布")}</div>}
      <div className={`workbench ${board.images.length ? '' : 'workbench-empty'}`}><Workbench uploads={uploads} onRememberUpload={rememberUpload} board={board} open={panel} onOpenChange={setPanel} phase={shownToolbar.phase} onUpload={chooseFiles} onReplace={replaceImage} onHelp={() => setModal('help')} onNotify={notify} /></div>
    </main>
    {shownToast.value && <div popover="manual" ref={element => { if (element && !element.matches(':popover-open')) element.showPopover(); }} data-phase={shownToast.phase} className="toast" role="status">{shownToast.value}</div>}
    {shownModal.value === 'upload' && <AssetPicker locale={locale} phase={shownModal.phase} uploads={uploads} onUpload={rememberUpload} onClose={() => setModal(null)} onConfirm={image => confirmImages([image])} onConfirmBatch={replaceTarget.current ? undefined : confirmImages} />}
    {shownModal.value && shownModal.value !== 'upload' && <Dialog phase={shownModal.phase} title={shownModal.value === 'project' ? t("项目概览") : shownModal.value === 'help' ? t("画布操作指南") : shownModal.value === 'support' ? t("联系客服") : t("积分账户")} onClose={() => setModal(null)}>{shownModal.value === 'project' ? <><div className="project-summary p-4 rounded-xl mb-4"><p className="font-medium mb-1">{title}</p>{board.images.find(image => image.cover) && <img className="project-cover" src={board.images.find(image => image.cover)!.url} alt={t("项目封面")} />}<p className="text-xs text-muted">{t("设计生产工作台 ·")}{board.images.length} {t("张图片")}</p></div><p className="text-xs leading-5 text-muted">{t("当前项目仅保留在本次打开的页面中。")}</p><div className="flex justify-end mt-6"><Button variant="outline" onClick={() => setModal(null)}>{t("返回画布")}</Button></div></> : shownModal.value === 'help' ? <div className="help-content"><p>{t("点击素材卡，或者将图片拖入画布，开始设计。")}</p><dl><dt>{t("平移画布")}</dt><dd>{t("空格 + 拖动 / 手形工具 / 中键拖动 / 滚轮")}</dd><dt>{t("缩放画布")}</dt><dd>{t("⌘ / Ctrl / Option / Alt + 滚轮，或触控板捏合")}</dd><dt>{t("移动图片")}</dt><dd>{t("按住图片拖动")}</dd><dt>{t("恢复 100% / 适应画布")}</dt><dd>1 / 2</dd><dt>{t("删除选中图片")}</dt><dd>Delete / Backspace</dd><dt>{t("撤销上传、移动、删除")}</dt><dd>⌘ / Ctrl + Z</dd></dl><p className="muted">{t("当前 Demo 的图片仅保留在本次打开的页面中。")}</p></div> : shownModal.value === 'support' ? <p className="muted">{t("当前为设计生产工作台 Demo，暂未接入在线客服。")}</p> : <div><p className="muted">{t("演示账户可用积分")}</p><p className="text-3xl font-medium my-4">99,999</p><p className="muted">{t("当前 Demo 暂未接入积分购买。")}</p></div>}</Dialog>}
  </div>;
}
