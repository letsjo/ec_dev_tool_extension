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

/** size 입력을 음수/NaN 없는 안전한 collection size로 정규화한다. */
function toSafeCollectionSize(rawSize: unknown): number {
  return typeof rawSize === 'number' && Number.isFinite(rawSize)
    ? Math.max(0, Math.floor(rawSize))
    : 0;
}

interface CollectionPreviewBudget {
  remaining: number;
}

/** map-like entries를 preview 문자열로 정규화한다. */
function buildMapCollectionPreview({
  size,
  entries,
  depth,
  budget,
  maxLen,
  renderValue,
}: {
  size: number;
  entries: unknown[];
  depth: number;
  budget: CollectionPreviewBudget;
  maxLen: number;
  renderValue: (value: unknown, depth: number, budget: CollectionPreviewBudget) => string;
}): string {
  if (size === 0 || entries.length === 0) return `Map(${size}) {}`;
  if (depth >= 1) return `Map(${size})`;

  const boundedLen = Math.min(entries.length, maxLen);
  const parts: string[] = [];
  for (let i = 0; i < boundedLen; i += 1) {
    const pair = readMapTokenEntryPairValue(entries[i]);
    parts.push(
      `${renderValue(pair.key, depth + 1, budget)} => ${renderValue(pair.value, depth + 1, budget)}`,
    );
    if (budget.remaining <= 0) break;
  }
  const suffix = size > boundedLen ? ', …' : '';
  return `Map(${size}) {${parts.join(', ')}${suffix}}`;
}

/** set-like entries를 preview 문자열로 정규화한다. */
function buildSetCollectionPreview({
  size,
  entries,
  depth,
  budget,
  maxLen,
  renderValue,
}: {
  size: number;
  entries: unknown[];
  depth: number;
  budget: CollectionPreviewBudget;
  maxLen: number;
  renderValue: (value: unknown, depth: number, budget: CollectionPreviewBudget) => string;
}): string {
  if (size === 0 || entries.length === 0) return `Set(${size}) {}`;
  if (depth >= 1) return `Set(${size})`;

  const boundedLen = Math.min(entries.length, maxLen);
  const parts: string[] = [];
  for (let i = 0; i < boundedLen; i += 1) {
    parts.push(renderValue(entries[i], depth + 1, budget));
    if (budget.remaining <= 0) break;
  }
  const suffix = size > boundedLen ? ', …' : '';
  return `Set(${size}) {${parts.join(', ')}${suffix}}`;
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
    return buildMapCollectionPreview({
      size: toSafeCollectionSize(value.size),
      entries: Array.isArray(value.entries) ? value.entries : [],
      depth,
      budget,
      maxLen: 2,
      renderValue: buildJsonSummaryPreview,
    });
  }
  if (isSetToken(value)) {
    return buildSetCollectionPreview({
      size: toSafeCollectionSize(value.size),
      entries: Array.isArray(value.entries) ? value.entries : [],
      depth,
      budget,
      maxLen: 3,
      renderValue: buildJsonSummaryPreview,
    });
  }
  if (value === null || typeof value !== 'object') return formatPrimitive(value);

  if (Array.isArray(value)) {
    const collectionMeta = readDisplayCollectionMetaValue(value);
    if (collectionMeta?.type === 'map') {
      return buildMapCollectionPreview({
        size: toSafeCollectionSize(collectionMeta.size),
        entries: value,
        depth,
        budget,
        maxLen: 2,
        renderValue: buildJsonSummaryPreview,
      });
    }
    if (collectionMeta?.type === 'set') {
      return buildSetCollectionPreview({
        size: toSafeCollectionSize(collectionMeta.size),
        entries: value,
        depth,
        budget,
        maxLen: 3,
        renderValue: buildJsonSummaryPreview,
      });
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
    return buildMapCollectionPreview({
      size: toSafeCollectionSize(value.size),
      entries: Array.isArray(value.entries) ? value.entries : [],
      depth,
      budget,
      maxLen: 2,
      renderValue: buildHookInlinePreview,
    });
  }
  if (isSetToken(value)) {
    return buildSetCollectionPreview({
      size: toSafeCollectionSize(value.size),
      entries: Array.isArray(value.entries) ? value.entries : [],
      depth,
      budget,
      maxLen: 3,
      renderValue: buildHookInlinePreview,
    });
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
      return buildMapCollectionPreview({
        size: toSafeCollectionSize(collectionMeta.size),
        entries: value,
        depth,
        budget,
        maxLen: 2,
        renderValue: buildHookInlinePreview,
      });
    }
    if (collectionMeta?.type === 'set') {
      return buildSetCollectionPreview({
        size: toSafeCollectionSize(collectionMeta.size),
        entries: value,
        depth,
        budget,
        maxLen: 4,
        renderValue: buildHookInlinePreview,
      });
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
