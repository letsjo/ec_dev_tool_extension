import type { CollectionPreviewBudget } from './jsonCollectionPreview';
import { buildArrayPreview, buildObjectPreview } from './jsonObjectPreview';
import { consumePreviewBudget, createPreviewBudget } from './jsonPreviewBudget';
import {
  getObjectDisplayName,
  isJsonInternalMetaKey,
} from './jsonPreviewObjectMeta';
import {
  formatHookInlinePrimitive,
  formatPrimitive,
  readDehydratedPreviewText,
} from './jsonPreviewPrimitive';
import {
  buildHookInlineCollectionPreview as buildHookInlineCollectionPreviewValue,
  buildJsonSummaryCollectionPreview as buildJsonSummaryCollectionPreviewValue,
} from './jsonPreviewCollection';
import {
  buildHookInlineTokenPreview,
  buildJsonSummaryTokenPreview,
} from './jsonPreviewTokenStrategies';

/** 파생 데이터나 요약 값을 구성 */
export function buildJsonSummaryPreview(
  value: unknown,
  depth = 0,
  budget: CollectionPreviewBudget = createPreviewBudget(18),
): string {
  if (!consumePreviewBudget(budget)) return '…';

  const tokenPreview = buildJsonSummaryTokenPreview(value);
  if (tokenPreview) return tokenPreview;

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
  budget: CollectionPreviewBudget = createPreviewBudget(32),
): string {
  if (!consumePreviewBudget(budget)) return '…';

  const tokenPreview = buildHookInlineTokenPreview(value);
  if (tokenPreview) return tokenPreview;

  const collectionPreview = buildHookInlineCollectionPreviewValue(
    value,
    depth,
    budget,
    buildHookInlinePreview,
  );
  if (collectionPreview) return collectionPreview;

  const primitivePreview = formatHookInlinePrimitive(value);
  if (primitivePreview) return primitivePreview;

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

export { formatPrimitive, getObjectDisplayName, isJsonInternalMetaKey, readDehydratedPreviewText };
