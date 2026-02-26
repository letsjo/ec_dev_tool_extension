import { readObjectRefId } from '../../../shared/inspector';
import { isJsonInternalMetaKey } from './preview/jsonPreview';

/** JSON 렌더 루트에서 __ecRefId -> 원본 값 역참조 맵을 수집한다. */
export function collectJsonRefMap(root: unknown): Map<number, unknown> {
  const map = new Map<number, unknown>();
  const visited = new WeakSet<object>();
  let remaining = 4000;

  const walk = (value: unknown) => {
    if (remaining <= 0) return;
    if (value === null || typeof value !== 'object') return;
    if (visited.has(value)) return;
    visited.add(value);
    remaining -= 1;

    const refId = readObjectRefId(value);
    if (refId !== null && !map.has(refId)) {
      map.set(refId, value);
    }

    if (Array.isArray(value)) {
      const maxLen = Math.min(value.length, 80);
      for (let i = 0; i < maxLen && remaining > 0; i += 1) {
        walk(value[i]);
      }
      return;
    }

    let scannedKeys = 0;
    for (const [key, child] of Object.entries(value)) {
      if (isJsonInternalMetaKey(key)) continue;
      walk(child);
      scannedKeys += 1;
      if (scannedKeys >= 100 || remaining <= 0) break;
    }
  };

  walk(root);
  return map;
}
