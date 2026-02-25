import { describe, expect, it } from 'vitest';
import { normalizeCollectionTokenForDisplay } from '../../src/features/panel/reactInspector/collectionDisplay';
import { buildObjectArraySummary } from '../../src/features/panel/reactInspector/jsonObjectArraySummary';

describe('jsonObjectArraySummary', () => {
  it('builds hook section summary without meta prefix', () => {
    const summary = buildObjectArraySummary({ __ecType: 'function', name: 'loadData' }, 'hooks');

    expect(summary.metaText).toBeNull();
    expect(summary.previewText).toBe('loadData() {}');
  });

  it('builds map/set/array meta text for props section arrays', () => {
    const mapDisplayValue = normalizeCollectionTokenForDisplay({
      __ecType: 'map',
      size: 3,
      entries: [
        ['a', 1],
        ['b', 2],
      ],
    });
    const mapSummary = buildObjectArraySummary(mapDisplayValue, 'props');
    expect(mapSummary.metaText).toBe('Map(3)');
    expect(mapSummary.previewText).toContain('Map(3)');

    const plainArraySummary = buildObjectArraySummary([1, 2, 3], 'props');
    expect(plainArraySummary.metaText).toBe('Array(3)');
  });

  it('builds object meta using class name and visible key count', () => {
    const summary = buildObjectArraySummary(
      {
        __ecObjectClassName: 'UserModel',
        __ecRefId: 10,
        id: 7,
      },
      'props',
    );

    expect(summary.metaText).toBe('UserModel(1)');
    expect(summary.previewText).toContain('id: 7');
  });
});
