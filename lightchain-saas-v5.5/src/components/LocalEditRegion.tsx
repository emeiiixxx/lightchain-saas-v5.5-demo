import { useRef, type PointerEvent } from 'react';
import type { CanvasImage, useCanvas } from '../useCanvas';
import { IconButton } from './ui';

// Normalized image coordinates keep the draft stable when the viewport changes.
export type EditRegion = { x: number; y: number; width: number; height: number };
export function LocalEditRegion({ board, image, drawing, region, onChange, label, clearLabel }: {
  board: ReturnType<typeof useCanvas>; image: CanvasImage; drawing: boolean;
  region?: EditRegion; onChange: (region?: EditRegion) => void; label: string; clearLabel: string;
}) {
  const origin = useRef<{ x: number; y: number } | null>(null);
  const point = (event: PointerEvent<HTMLDivElement>) => {
    const canvas = board.canvasRef.current!.getBoundingClientRect();
    const x = (event.clientX - canvas.left - board.camera.x) / board.camera.zoom - image.x - image.width / 2;
    const y = (event.clientY - canvas.top - board.camera.y) / board.camera.zoom - image.y - image.height / 2;
    const angle = -(image.rotation ?? 0) * Math.PI / 180;
    return { x: Math.max(0, Math.min(1, (x * Math.cos(angle) - y * Math.sin(angle)) / image.width + .5)), y: Math.max(0, Math.min(1, (x * Math.sin(angle) + y * Math.cos(angle)) / image.height + .5)) };
  };
  const move = (event: PointerEvent<HTMLDivElement>) => {
    const start = origin.current; if (!start) return;
    const end = point(event);
    onChange({ x: Math.min(start.x, end.x), y: Math.min(start.y, end.y), width: Math.abs(end.x - start.x), height: Math.abs(end.y - start.y) });
  };
  return <div className="local-edit-region" data-canvas-ui data-drawing={drawing} aria-label={label} style={{ left: image.x * board.camera.zoom + board.camera.x, top: image.y * board.camera.zoom + board.camera.y, width: image.width * board.camera.zoom, height: image.height * board.camera.zoom, transform: `rotate(${image.rotation ?? 0}deg)` }}
    onPointerDown={event => { if (!drawing || event.button !== 0 || (event.target as Element).closest('button')) return; event.preventDefault(); event.stopPropagation(); origin.current = point(event); event.currentTarget.setPointerCapture(event.pointerId); }}
    onPointerMove={move} onPointerUp={event => { if (!origin.current) return; move(event); origin.current = null; event.currentTarget.releasePointerCapture(event.pointerId); }} onPointerCancel={() => { origin.current = null; }}>
    {region && region.width > .002 && region.height > .002 && <div className="local-edit-region-mark" style={{ left: `${region.x * 100}%`, top: `${region.y * 100}%`, width: `${region.width * 100}%`, height: `${region.height * 100}%` }}><IconButton size="s" icon="close" aria-label={clearLabel} onClick={() => onChange(undefined)} /></div>}
  </div>;
}
