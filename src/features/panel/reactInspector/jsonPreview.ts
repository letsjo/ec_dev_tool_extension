import {
  isCircularRefToken,
  isDehydratedToken,
  isFunctionToken,
  isRecord,
} from '../../../shared/inspector/guards';
import type { CollectionPreviewBudget } from './jsonCollectionPreview';
import { buildArrayPreview, buildObjectPreview } from './jsonObjectPreview';
import {
  buildHookInlineCollectionPreview as buildHookInlineCollectionPreviewValue,
  buildJsonSummaryCollectionPreview as buildJsonSummaryCollectionPreviewValue,
} from './jsonPreviewCollection';

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

  const collectionPreview = buildJsonSummaryCollectionPreviewValue(
    value,
    depth,
    budget,
    buildJsonSummaryPreview,
  );
  if (collectionPreview) return collectionPreview;

  if (value === null || typeof value !== 'object') return formatPrimitive(value);

  if (Array.isArray(value)) {
    return buildArrayPreview({
      value,
      depth,
      budget,
      renderValue: buildJsonSummaryPreview,
      maxDepth: 1,
      maxLen: 3,
      collapsedText: `Array(${value.length})`,
    });
  }

  return buildObjectPreview({
    value: value as Record<string, unknown>,
    depth,
    budget,
    renderValue: buildJsonSummaryPreview,
    maxDepth: 1,
    maxLen: 3,
    isInternalMetaKey: isJsonInternalMetaKey,
    getObjectDisplayName,
  });
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

  const collectionPreview = buildHookInlineCollectionPreviewValue(
    value,
    depth,
    budget,
    buildHookInlinePreview,
  );
  if (collectionPreview) return collectionPreview;

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
    return buildArrayPreview({
      value,
      depth,
      budget,
      renderValue: buildHookInlinePreview,
      maxDepth: 2,
      maxLen: 9,
      collapsedText: '[…]',
    });
  }

  if (typeof value === 'object') {
    return buildObjectPreview({
      value: value as Record<string, unknown>,
      depth,
      budget,
      renderValue: buildHookInlinePreview,
      maxDepth: 1,
      maxLen: 3,
      isInternalMetaKey: isJsonInternalMetaKey,
      getObjectDisplayName,
    });
  }

  return String(value);
}
