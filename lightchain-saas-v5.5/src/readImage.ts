import type { CanvasImage } from './useCanvas';
import { rememberImagePreview } from './image-previews';

// v5.3 upload validation, retaining the decoded image for the Canvas 2D renderer.
export async function readImage(file: File): Promise<Omit<CanvasImage, 'x' | 'y'>> {
  if (!['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'].includes(file.type) || file.size > 20 * 1024 * 1024) throw new Error('invalid_image');
  const url = URL.createObjectURL(file);
  try {
    const image = new Image(); image.src = url; await image.decode();
    rememberImagePreview(url, image);
    const width = Math.min(320, image.naturalWidth);
    return { id: crypto.randomUUID(), name: file.name, mimeType: file.type, url, width, height: width * image.naturalHeight / image.naturalWidth, image };
  } catch (error) { URL.revokeObjectURL(url); throw error; }
}
