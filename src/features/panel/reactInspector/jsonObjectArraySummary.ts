import type { JsonSectionKind } from '../../../shared/inspector/types';
import { readDisplayCollectionMeta as readDisplayCollectionMetaValue } from './collectionDisplay';
import {
  buildHookInlinePreview,
  buildJsonSummaryPreview,
  getObjectDisplayName,
  isJsonInternalMetaKey,
} from './jsonPreview';

export interface JsonObjectArraySummary {
  metaText: string | null;
  previewText: string;
}

/** object/array details summary의 meta/preview 문자열을 계산한다. */
export function buildObjectArraySummary(
  value: unknown,
  section: JsonSectionKind,
): JsonObjectArraySummary {
  if (section === 'hooks') {
    return {
      metaText: null,
      previewText: buildHookInlinePreview(value),
    };
  }

  if (Array.isArray(value)) {
    const collectionMeta = readDisplayCollectionMetaValue(value);
    const previewText = buildJsonSummaryPreview(value);
    if (collectionMeta?.type === 'map') {
      return {
        metaText: `Map(${collectionMeta.size})`,
        previewText,
      };
    }
    if (collectionMeta?.type === 'set') {
      return {
        metaText: `Set(${collectionMeta.size})`,
        previewText,
      };
    }
    return {
      metaText: `Array(${value.length})`,
      previewText,
    };
  }

  const visibleKeyCount =
    value && typeof value === 'object'
      ? Object.keys(value as Record<string, unknown>).filter((key) => !isJsonInternalMetaKey(key))
          .length
      : 0;
  const objectName = getObjectDisplayName(value);
  return {
    metaText: `${objectName}(${visibleKeyCount})`,
    previewText: buildJsonSummaryPreview(value),
  };
}
