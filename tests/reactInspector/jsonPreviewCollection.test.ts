import { describe, expect, it } from 'vitest';
import { normalizeCollectionTokenForDisplay } from '../../src/features/panel/reactInspector/collectionDisplay';
import {
  buildHookInlineCollectionPreview,
  buildJsonSummaryCollectionPreview,
} from '../../src/features/panel/reactInspector/preview/jsonPreviewCollection';

describe('jsonPreviewCollection', () => {
  it('applies different set array limits for json summary and hook inline previews', () => {
    const displaySet = normalizeCollectionTokenForDisplay({
      __ecType: 'set',
      size: 4,
      entries: [1, 2, 3, 4],
    });

    const jsonSummary = buildJsonSummaryCollectionPreview(
      displaySet,
      0,
      { remaining: 32 },
      (value) => String(value),
    );
    const hookInline = buildHookInlineCollectionPreview(
      displaySet,
      0,
      { remaining: 32 },
      (value) => String(value),
    );

    expect(jsonSummary).toBe('Set(4) {1, 2, 3, …}');
    expect(hookInline).toBe('Set(4) {1, 2, 3, 4}');
  });

  it('returns null for non-collection values', () => {
    expect(
      buildJsonSummaryCollectionPreview(
        { plain: true },
        0,
        { remaining: 16 },
        (value) => String(value),
      ),
    ).toBeNull();
    expect(
      buildHookInlineCollectionPreview(
        42,
        0,
        { remaining: 16 },
        (value) => String(value),
      ),
    ).toBeNull();
  });
});
