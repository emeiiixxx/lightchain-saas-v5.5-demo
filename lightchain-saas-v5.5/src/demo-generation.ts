import { prepareMainImage } from './asset-library';

// Existing original Figma images stand in for AI outputs in this interaction demo.
const sources = [
  '/assets/generation-record-imgAsset.png',
  '/assets/generation-record-imgAsset1.png',
  '/assets/generation-record-imgAsset2.png',
  '/assets/generation-record-imgAsset3.png',
];
let cached: ReturnType<typeof loadResults> | undefined;
function loadResults() {
  return Promise.all(sources.map((url, index) => prepareMainImage({ id: url, name: `快捷编辑 · ${index + 1}`, url })));
}
export function prepareDemoResults() {
  cached ??= loadResults().catch(error => { cached = undefined; throw error; });
  return cached;
}
