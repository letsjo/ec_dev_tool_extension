import { isMapToken, isSetToken } from '../../../../shared/inspector/guards';
import {
  readDisplayCollectionMeta as readDisplayCollectionMetaValue,
  readMapTokenEntryPair as readMapTokenEntryPairValue,
} from '../collectionDisplay';
import { isPreviewBudgetExhausted } from './jsonPreviewBudget';

export interface CollectionPreviewBudget {
  remaining: number;
}

export interface CollectionPreviewLimits {
  mapTokenMaxLen: number;
  setTokenMaxLen: number;
  mapArrayMaxLen: number;
  setArrayMaxLen: number;
}

/** size 입력을 음수/NaN 없는 안전한 collection size로 정규화한다. */
function toSafeCollectionSize(rawSize: unknown): number {
  return typeof rawSize === 'number' && Number.isFinite(rawSize)
    ? Math.max(0, Math.floor(rawSize))
    : 0;
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
    if (isPreviewBudgetExhausted(budget)) break;
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
    if (isPreviewBudgetExhausted(budget)) break;
  }
  const suffix = size > boundedLen ? ', …' : '';
  return `Set(${size}) {${parts.join(', ')}${suffix}}`;
}

/** map/set token 또는 display collection meta 배열을 preview 문자열로 정규화한다. */
export function buildCollectionPreviewFromValue({
  value,
  depth,
  budget,
  renderValue,
  limits,
}: {
  value: unknown;
  depth: number;
  budget: CollectionPreviewBudget;
  renderValue: (value: unknown, depth: number, budget: CollectionPreviewBudget) => string;
  limits: CollectionPreviewLimits;
}): string | null {
  if (isMapToken(value)) {
    return buildMapCollectionPreview({
      size: toSafeCollectionSize(value.size),
      entries: Array.isArray(value.entries) ? value.entries : [],
      depth,
      budget,
      maxLen: limits.mapTokenMaxLen,
      renderValue,
    });
  }

  if (isSetToken(value)) {
    return buildSetCollectionPreview({
      size: toSafeCollectionSize(value.size),
      entries: Array.isArray(value.entries) ? value.entries : [],
      depth,
      budget,
      maxLen: limits.setTokenMaxLen,
      renderValue,
    });
  }

  if (!Array.isArray(value)) return null;
  const collectionMeta = readDisplayCollectionMetaValue(value);
  if (collectionMeta?.type === 'map') {
    return buildMapCollectionPreview({
      size: toSafeCollectionSize(collectionMeta.size),
      entries: value,
      depth,
      budget,
      maxLen: limits.mapArrayMaxLen,
      renderValue,
    });
  }

  if (collectionMeta?.type === 'set') {
    return buildSetCollectionPreview({
      size: toSafeCollectionSize(collectionMeta.size),
      entries: value,
      depth,
      budget,
      maxLen: limits.setArrayMaxLen,
      renderValue,
    });
  }

  return null;
}
