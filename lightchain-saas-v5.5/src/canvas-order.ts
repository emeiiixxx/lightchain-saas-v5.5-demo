import type { CanvasImage } from './useCanvas';

// A monotonic timestamp preserves insertion order within a batch, even when
// several items arrive in the same millisecond or the system clock changes.
let lastTime = 0;
export function nextCanvasTime() {
  lastTime = Math.max(Date.now(), lastTime + 1);
  return lastTime;
}

/** Manual groups are atomic; related ungrouped results follow their source. */
export function orderArrangementUnits(units: CanvasImage[][], images: CanvasImage[], time: (image: CanvasImage) => number) {
  const byId = new Map(images.map(image => [image.id, image]));
  const describe = (members: CanvasImage[]) => {
    const image = members[0];
    if (image.groupId) return { key: `group:${image.groupId}`, time: time(image), path: [] as number[] };
    const path: number[] = [], seen = new Set<string>();
    let current = image;
    while (!seen.has(current.id)) {
      seen.add(current.id);
      if (current.groupId) return { key: `group:${current.groupId}`, time: time(current), path: path.reverse() };
      if (!current.generationParentId) return { key: `image:${current.id}`, time: time(current), path: path.reverse() };
      path.push(current.addedAt ?? time(current));
      const parent = byId.get(current.generationParentId);
      if (parent) { current = parent; continue; }
      // Deleting an intermediate result must not detach surviving descendants from the root.
      const root = current.generationRootId ? byId.get(current.generationRootId) : undefined;
      if (root && !seen.has(root.id)) { current = root; continue; }
      return { key: `image:${current.generationRootId ?? current.generationParentId}`, time: current.generationRootAddedAt ?? time(current), path: path.reverse() };
    }
    return { key: `image:${image.id}`, time: time(image), path: [] as number[] };
  };
  const comparePath = (a: number[], b: number[]) => {
    for (let i = 0; i < Math.min(a.length, b.length); i++) if (a[i] !== b[i]) return a[i] - b[i];
    return a.length - b.length;
  };
  return units.map(members => ({ members, order: describe(members) })).sort((a, b) => {
    if (a.order.key === b.order.key) return comparePath(a.order.path, b.order.path);
    return a.order.time - b.order.time || a.order.key.localeCompare(b.order.key);
  }).map(item => item.members);
}
