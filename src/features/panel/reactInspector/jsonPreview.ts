import {
  isCircularRefToken,
  isDehydratedToken,
  isFunctionToken,
  isMapToken,
  isRecord,
  isSetToken,
} from '../../../shared/inspector/guards';
import {
  readDisplayCollectionMeta as readDisplayCollectionMetaValue,
  readMapTokenEntryPair as readMapTokenEntryPairValue,
} from './collectionDisplay';

const OBJECT_CLASS_NAME_META_KEY = '__ecObjectClassName';

/** 조건 여부를 판별 */
export function isJsonInternalMetaKey(key: string): boolean {
  return key === '__ecRefId' || key === OBJECT_CLASS_NAME_META_KEY;
}

/** 필요한 값/상태를 계산해 반환 */
function readObjectClassNameMeta(value: unknown): string | null {
  if (!isRecord(value)) return null;
  const classNameRaw = value[OBJECT_CLASS_NAME_META_KEY];
  if (typeof classNameRaw !== 'string') return null;
  const className = classNameRaw.trim();
  if (!className || className === 'Object') return null;
  return className;
}

/** 필요한 값/상태를 계산해 반환 */
export function getObjectDisplayName(value: unknown): string {
  return readObjectClassNameMeta(value) ?? 'Object';
}

/** 표시용 문자열을 포맷 */
export function formatPrimitive(value: unknown): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (/^<[a-zA-Z][\w:-]*\s*\/>$/.test(trimmed)) return trimmed;
    return `"${value.length > 60 ? `${value.slice(0, 60)}…` : value}"`;
  }
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint')
    return String(value);
  if (typeof value === 'symbol') return String(value);
  return String(value);
}

/** 표시용 문자열을 포맷 */
export function readDehydratedPreviewText(value: unknown): string {
  if (!isDehydratedToken(value)) return '{…}';
  if (typeof value.preview === 'string' && value.preview.trim()) {
    return value.preview;
  }
  const sizeText =
    typeof value.size === 'number' && Number.isFinite(value.size)
      ? `(${Math.max(0, Math.floor(value.size))})`
      : '';
  if (value.valueType === 'array') return `Array${sizeText}`;
  if (value.valueType === 'map') return `Map${sizeText}`;
  if (value.valueType === 'set') return `Set${sizeText}`;
  if (value.valueType === 'object') return `Object${sizeText}`;
  return '{…}';
}

/** 파생 데이터나 요약 값을 구성 */
export function buildJsonSummaryPreview(
  value: unknown,
  depth = 0,
  budget = { remaining: 18 },
): string {
  if (budget.remaining <= 0) return '…';
  budget.remaining -= 1;

  if (isFunctionToken(value)) return `function ${value.name ?? '(anonymous)'}`;
  if (isCircularRefToken(value)) return `[Circular #${value.refId}]`;
  if (isDehydratedToken(value)) return readDehydratedPreviewText(value);
  if (isMapToken(value)) {
    const size =
      typeof value.size === 'number' && Number.isFinite(value.size)
        ? Math.max(0, Math.floor(value.size))
        : 0;
    const rawEntries = Array.isArray(value.entries) ? value.entries : [];
    if (size === 0 || rawEntries.length === 0) return `Map(${size}) {}`;
    if (depth >= 1) return `Map(${size})`;

    const maxLen = Math.min(rawEntries.length, 2);
    const parts: string[] = [];
    for (let i = 0; i < maxLen; i += 1) {
      const pair = readMapTokenEntryPairValue(rawEntries[i]);
      parts.push(
        `${buildJsonSummaryPreview(pair.key, depth + 1, budget)} => ${buildJsonSummaryPreview(pair.value, depth + 1, budget)}`,
      );
      if (budget.remaining <= 0) break;
    }
    const suffix = size > maxLen ? ', …' : '';
    return `Map(${size}) {${parts.join(', ')}${suffix}}`;
  }
  if (isSetToken(value)) {
    const size =
      typeof value.size === 'number' && Number.isFinite(value.size)
        ? Math.max(0, Math.floor(value.size))
        : 0;
    const rawEntries = Array.isArray(value.entries) ? value.entries : [];
    if (size === 0 || rawEntries.length === 0) return `Set(${size}) {}`;
    if (depth >= 1) return `Set(${size})`;

    const maxLen = Math.min(rawEntries.length, 3);
    const parts: string[] = [];
    for (let i = 0; i < maxLen; i += 1) {
      parts.push(buildJsonSummaryPreview(rawEntries[i], depth + 1, budget));
      if (budget.remaining <= 0) break;
    }
    const suffix = size > maxLen ? ', …' : '';
    return `Set(${size}) {${parts.join(', ')}${suffix}}`;
  }
  if (value === null || typeof value !== 'object') return formatPrimitive(value);

  if (Array.isArray(value)) {
    const collectionMeta = readDisplayCollectionMetaValue(value);
    if (collectionMeta?.type === 'map') {
      if (collectionMeta.size === 0 || value.length === 0) return `Map(${collectionMeta.size}) {}`;
      if (depth >= 1) return `Map(${collectionMeta.size})`;
      const maxLen = Math.min(value.length, 2);
      const parts: string[] = [];
      for (let i = 0; i < maxLen; i += 1) {
        const pair = readMapTokenEntryPairValue(value[i]);
        parts.push(
          `${buildJsonSummaryPreview(pair.key, depth + 1, budget)} => ${buildJsonSummaryPreview(pair.value, depth + 1, budget)}`,
        );
        if (budget.remaining <= 0) break;
      }
      const suffix = collectionMeta.size > maxLen ? ', …' : '';
      return `Map(${collectionMeta.size}) {${parts.join(', ')}${suffix}}`;
    }
    if (collectionMeta?.type === 'set') {
      if (collectionMeta.size === 0 || value.length === 0) return `Set(${collectionMeta.size}) {}`;
      if (depth >= 1) return `Set(${collectionMeta.size})`;
      const maxLen = Math.min(value.length, 3);
      const parts: string[] = [];
      for (let i = 0; i < maxLen; i += 1) {
        parts.push(buildJsonSummaryPreview(value[i], depth + 1, budget));
        if (budget.remaining <= 0) break;
      }
      const suffix = collectionMeta.size > maxLen ? ', …' : '';
      return `Set(${collectionMeta.size}) {${parts.join(', ')}${suffix}}`;
    }
    if (value.length === 0) return '[]';
    if (depth >= 1) return `Array(${value.length})`;
    const maxLen = Math.min(value.length, 3);
    const previewItems: string[] = [];
    for (let i = 0; i < maxLen; i += 1) {
      previewItems.push(buildJsonSummaryPreview(value[i], depth + 1, budget));
      if (budget.remaining <= 0) break;
    }
    const suffix = value.length > maxLen ? ', …' : '';
    return `[${previewItems.join(', ')}${suffix}]`;
  }

  const objectName = getObjectDisplayName(value);
  const entries = Object.entries(value as Record<string, unknown>).filter(
    ([key]) => !isJsonInternalMetaKey(key),
  );
  if (entries.length === 0) return objectName === 'Object' ? '{}' : `${objectName} {}`;
  if (depth >= 1) return `${objectName}(${entries.length})`;

  const maxLen = Math.min(entries.length, 3);
  const parts: string[] = [];
  for (let i = 0; i < maxLen; i += 1) {
    const [key, child] = entries[i];
    parts.push(`${key}: ${buildJsonSummaryPreview(child, depth + 1, budget)}`);
    if (budget.remaining <= 0) break;
  }
  const suffix = entries.length > maxLen ? ', …' : '';
  const objectBody = `{${parts.join(', ')}${suffix}}`;
  return objectName === 'Object' ? objectBody : `${objectName} ${objectBody}`;
}

/** 파생 데이터나 요약 값을 구성 */
export function buildHookInlinePreview(
  value: unknown,
  depth = 0,
  budget = { remaining: 32 },
): string {
  if (budget.remaining <= 0) return '…';
  budget.remaining -= 1;

  if (isFunctionToken(value)) {
    const fnName = typeof value.name === 'string' ? value.name.trim() : '';
    return fnName ? `${fnName}() {}` : '() => {}';
  }
  if (isCircularRefToken(value)) return '{…}';
  if (isDehydratedToken(value)) return readDehydratedPreviewText(value);
  if (isMapToken(value)) {
    const size =
      typeof value.size === 'number' && Number.isFinite(value.size)
        ? Math.max(0, Math.floor(value.size))
        : 0;
    const rawEntries = Array.isArray(value.entries) ? value.entries : [];
    if (size === 0 || rawEntries.length === 0) return `Map(${size}) {}`;
    if (depth >= 1) return `Map(${size})`;
    const maxLen = Math.min(rawEntries.length, 2);
    const parts: string[] = [];
    for (let i = 0; i < maxLen; i += 1) {
      const pair = readMapTokenEntryPairValue(rawEntries[i]);
      parts.push(
        `${buildHookInlinePreview(pair.key, depth + 1, budget)} => ${buildHookInlinePreview(pair.value, depth + 1, budget)}`,
      );
      if (budget.remaining <= 0) break;
    }
    const suffix = size > maxLen ? ', …' : '';
    return `Map(${size}) {${parts.join(', ')}${suffix}}`;
  }
  if (isSetToken(value)) {
    const size =
      typeof value.size === 'number' && Number.isFinite(value.size)
        ? Math.max(0, Math.floor(value.size))
        : 0;
    const rawEntries = Array.isArray(value.entries) ? value.entries : [];
    if (size === 0 || rawEntries.length === 0) return `Set(${size}) {}`;
    if (depth >= 1) return `Set(${size})`;
    const maxLen = Math.min(rawEntries.length, 3);
    const parts: string[] = [];
    for (let i = 0; i < maxLen; i += 1) {
      parts.push(buildHookInlinePreview(rawEntries[i], depth + 1, budget));
      if (budget.remaining <= 0) break;
    }
    const suffix = size > maxLen ? ', …' : '';
    return `Set(${size}) {${parts.join(', ')}${suffix}}`;
  }
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (/^<[a-zA-Z][\w:-]*\s*\/>$/.test(trimmed)) return trimmed;
    const text = value.length > 36 ? `${value.slice(0, 36)}…` : value;
    return `"${text}"`;
  }
  if (
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    typeof value === 'bigint' ||
    typeof value === 'symbol'
  ) {
    return String(value);
  }

  if (Array.isArray(value)) {
    const collectionMeta = readDisplayCollectionMetaValue(value);
    if (collectionMeta?.type === 'map') {
      if (collectionMeta.size === 0 || value.length === 0) return `Map(${collectionMeta.size}) {}`;
      if (depth >= 1) return `Map(${collectionMeta.size})`;
      const maxLen = Math.min(value.length, 2);
      const parts: string[] = [];
      for (let i = 0; i < maxLen; i += 1) {
        const pair = readMapTokenEntryPairValue(value[i]);
        parts.push(
          `${buildHookInlinePreview(pair.key, depth + 1, budget)} => ${buildHookInlinePreview(pair.value, depth + 1, budget)}`,
        );
        if (budget.remaining <= 0) break;
      }
      const suffix = collectionMeta.size > maxLen ? ', …' : '';
      return `Map(${collectionMeta.size}) {${parts.join(', ')}${suffix}}`;
    }
    if (collectionMeta?.type === 'set') {
      if (collectionMeta.size === 0 || value.length === 0) return `Set(${collectionMeta.size}) {}`;
      if (depth >= 1) return `Set(${collectionMeta.size})`;
      const maxLen = Math.min(value.length, 4);
      const parts: string[] = [];
      for (let i = 0; i < maxLen; i += 1) {
        parts.push(buildHookInlinePreview(value[i], depth + 1, budget));
        if (budget.remaining <= 0) break;
      }
      const suffix = collectionMeta.size > maxLen ? ', …' : '';
      return `Set(${collectionMeta.size}) {${parts.join(', ')}${suffix}}`;
    }
    if (value.length === 0) return '[]';
    if (depth >= 2) return '[…]';
    const maxLen = Math.min(value.length, 9);
    const items: string[] = [];
    for (let i = 0; i < maxLen; i += 1) {
      items.push(buildHookInlinePreview(value[i], depth + 1, budget));
      if (budget.remaining <= 0) break;
    }
    const suffix = value.length > maxLen ? ', …' : '';
    return `[${items.join(', ')}${suffix}]`;
  }

  if (typeof value === 'object') {
    const objectName = getObjectDisplayName(value);
    const entries = Object.entries(value as Record<string, unknown>).filter(
      ([key]) => !isJsonInternalMetaKey(key),
    );
    if (entries.length === 0) return objectName === 'Object' ? '{}' : `${objectName} {}`;
    if (depth >= 1) return `${objectName}(${entries.length})`;
    const maxLen = Math.min(entries.length, 3);
    const parts: string[] = [];
    for (let i = 0; i < maxLen; i += 1) {
      const [key, child] = entries[i];
      parts.push(`${key}: ${buildHookInlinePreview(child, depth + 1, budget)}`);
      if (budget.remaining <= 0) break;
    }
    const suffix = entries.length > maxLen ? ', …' : '';
    const objectBody = `{${parts.join(', ')}${suffix}}`;
    return objectName === 'Object' ? objectBody : `${objectName} ${objectBody}`;
  }

  return String(value);
}
