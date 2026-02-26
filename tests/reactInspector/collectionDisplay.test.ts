import { describe, expect, it } from 'vitest';
import {
  normalizeCollectionTokenForDisplay,
  readDisplayCollectionMeta,
  readMapTokenEntryPair,
  resolveDisplayChildPathSegment,
} from '../../src/features/panel/reactInspector/collectionDisplay';

describe('collectionDisplay', () => {
  it('normalizes map token into display entries with path/meta mapping', () => {
    const normalized = normalizeCollectionTokenForDisplay({
      __ecType: 'map',
      size: 3,
      entries: [
        ['a', 1],
        ['b', 2],
      ],
    });

    expect(Array.isArray(normalized)).toBe(true);
    expect(normalized).toEqual([['a', 1], ['b', 2], '[+1 more entries]']);
    expect(readDisplayCollectionMeta(normalized)).toEqual({
      type: 'map',
      size: 3,
    });
    expect(resolveDisplayChildPathSegment(normalized, 0)).toBe('__ec_map_entry__0');
    expect(resolveDisplayChildPathSegment(normalized, 1)).toBe('__ec_map_entry__1');
    expect(resolveDisplayChildPathSegment(normalized, 9)).toBe(9);
  });

  it('normalizes set token into display entries with path/meta mapping', () => {
    const normalized = normalizeCollectionTokenForDisplay({
      __ecType: 'set',
      size: 4,
      entries: ['x', 'y'],
    });

    expect(normalized).toEqual(['x', 'y']);
    expect(readDisplayCollectionMeta(normalized)).toEqual({
      type: 'set',
      size: 4,
    });
    expect(resolveDisplayChildPathSegment(normalized, 0)).toBe('__ec_set_entry__0');
    expect(resolveDisplayChildPathSegment(normalized, 1)).toBe('__ec_set_entry__1');
  });

  it('reads map entry pairs from array/object/scalar shapes', () => {
    expect(readMapTokenEntryPair(['k', 'v'])).toEqual({
      key: 'k',
      value: 'v',
    });
    expect(readMapTokenEntryPair({ key: 'k2' })).toEqual({
      key: 'k2',
      value: undefined,
    });
    expect(readMapTokenEntryPair(123)).toEqual({
      key: undefined,
      value: 123,
    });
  });

  it('keeps original path segment when no display path map exists', () => {
    expect(resolveDisplayChildPathSegment(['a', 'b'], 1)).toBe(1);
    expect(readDisplayCollectionMeta(['a', 'b'])).toBeNull();
  });
});
