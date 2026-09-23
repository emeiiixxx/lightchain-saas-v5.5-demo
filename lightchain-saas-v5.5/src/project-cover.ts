import type { CanvasImage } from './useCanvas';

// Keep automatic selection derived from the surviving images. Only an explicit
// user choice is stored in `cover`, so new results can still update the default.
export function resolveProjectCover(images: CanvasImage[]): CanvasImage | undefined {
  const ready = images.filter(image => !image.generating);
  const manual = ready.find(image => image.cover);
  if (manual) return manual;
  const latest = (items: CanvasImage[], timestamp: (image: CanvasImage) => number) => items.reduce<CanvasImage | undefined>((current, image) => {
    if (!current) return image;
    const delta = timestamp(image) - timestamp(current);
    const order = (image.generationIndex ?? 0) - (current.generationIndex ?? 0);
    return delta > 0 || (delta === 0 && (order > 0 || (order === 0 && image.id > current.id))) ? image : current;
  }, undefined);
  const generated = ready.filter(image => image.origin !== 'copy' && (image.origin === 'generated' || image.generationBatchId || image.generatedAt !== undefined));
  const uploads = ready.filter(image => image.origin === 'upload' || (!image.origin && !image.generationBatchId && image.generatedAt === undefined));
  return latest(generated, image => image.generatedAt ?? image.addedAt ?? 0)
    ?? latest(uploads, image => image.uploadedAt ?? image.addedAt ?? 0);
}
