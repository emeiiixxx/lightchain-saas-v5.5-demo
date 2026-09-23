import { arrangementGap } from './canvas-arrangement';
import { selectionBounds, type Bounds } from './canvas-selection';
import type { CanvasImage } from './useCanvas';

const conflicts = (a: Bounds, b: Bounds) => a.x < b.x + b.width + arrangementGap
  && a.x + a.width + arrangementGap > b.x
  && a.y < b.y + b.height + arrangementGap
  && a.y + a.height + arrangementGap > b.y;

/** Source stays fixed. Only insertion collisions and their downstream chain move. */
export function makeRoomForResults(images: CanvasImage[], source: CanvasImage, results: CanvasImage[]) {
  if (!results.length) return images;
  const units = new Map<string, CanvasImage[]>();
  for (const image of images) {
    const key = image.groupId ? `group:${image.groupId}` : image.id;
    const members = units.get(key) ?? [];
    members.push(image); units.set(key, members);
  }
  const sourceKey = source.groupId ? `group:${source.groupId}` : source.id;
  const reserved = selectionBounds(results);
  const settled: { box: Bounds; moved: boolean }[] = [];
  const offsets = new Map<string, number>();
  const candidates = [...units.entries()].filter(([key]) => key !== sourceKey)
    .map(([, members]) => ({ members, box: selectionBounds(members) }))
    .sort((a, b) => a.box.x - b.box.x || a.box.y - b.box.y || a.members[0].id.localeCompare(b.members[0].id));
  for (const { members, box } of candidates) {
    let placed = { ...box }, moved = false;
    // Each pass can only advance beyond an obstacle's right edge, so this terminates.
    for (;;) {
      let x = placed.x;
      if (conflicts(placed, reserved)) x = Math.max(x, reserved.x + reserved.width + arrangementGap);
      for (const obstacle of settled) {
        // Existing overlaps outside the affected region are intentionally untouched.
        if ((moved || obstacle.moved) && conflicts(placed, obstacle.box)) x = Math.max(x, obstacle.box.x + obstacle.box.width + arrangementGap);
      }
      if (x === placed.x) break;
      placed = { ...placed, x }; moved = true;
    }
    settled.push({ box: placed, moved });
    if (moved) for (const image of members) offsets.set(image.id, placed.x - box.x);
  }
  return images.map(image => offsets.has(image.id) ? { ...image, x: image.x + offsets.get(image.id)! } : image);
}
