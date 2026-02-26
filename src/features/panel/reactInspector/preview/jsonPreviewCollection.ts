import {
  buildCollectionPreviewFromValue,
  type CollectionPreviewBudget,
} from './jsonCollectionPreview';

type JsonPreviewRenderer = (
  value: unknown,
  depth: number,
  budget: CollectionPreviewBudget,
) => string;

const JSON_SUMMARY_COLLECTION_LIMITS = {
  mapTokenMaxLen: 2,
  setTokenMaxLen: 3,
  mapArrayMaxLen: 2,
  setArrayMaxLen: 3,
} as const;

const HOOK_INLINE_COLLECTION_LIMITS = {
  mapTokenMaxLen: 2,
  setTokenMaxLen: 3,
  mapArrayMaxLen: 2,
  setArrayMaxLen: 4,
} as const;

/** json summary preview용 map/set collection preview를 구성한다. */
export function buildJsonSummaryCollectionPreview(
  value: unknown,
  depth: number,
  budget: CollectionPreviewBudget,
  renderValue: JsonPreviewRenderer,
): string | null {
  return buildCollectionPreviewFromValue({
    value,
    depth,
    budget,
    renderValue,
    limits: JSON_SUMMARY_COLLECTION_LIMITS,
  });
}

/** hook inline preview용 map/set collection preview를 구성한다. */
export function buildHookInlineCollectionPreview(
  value: unknown,
  depth: number,
  budget: CollectionPreviewBudget,
  renderValue: JsonPreviewRenderer,
): string | null {
  return buildCollectionPreviewFromValue({
    value,
    depth,
    budget,
    renderValue,
    limits: HOOK_INLINE_COLLECTION_LIMITS,
  });
}
