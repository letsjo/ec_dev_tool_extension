import { describe, expect, it } from 'vitest';
import {
  buildHookInlinePreview,
  buildJsonSummaryPreview,
  readDehydratedPreviewText,
} from '../../src/features/panel/reactInspector/jsonPreview';

describe('jsonPreview', () => {
  it('renders dehydrated fallback preview text by value type and size', () => {
    expect(readDehydratedPreviewText({ __ecType: 'dehydrated', valueType: 'map', size: 5 })).toBe(
      'Map(5)',
    );
    expect(
      readDehydratedPreviewText({ __ecType: 'dehydrated', valueType: 'array', size: -3 }),
    ).toBe('Array(0)');
  });

  it('renders map token summary with bounded entries and ellipsis', () => {
    const preview = buildJsonSummaryPreview({
      __ecType: 'map',
      size: 3,
      entries: [
        ['first', 1],
        ['second', 2],
        ['third', 3],
      ],
    });

    expect(preview).toContain('Map(3)');
    expect(preview).toContain('"first" => 1');
    expect(preview).toContain('"second" => 2');
    expect(preview).toContain('…');
  });

  it('ignores json internal meta keys when building object preview', () => {
    const preview = buildJsonSummaryPreview({
      __ecObjectClassName: 'CustomModel',
      __ecRefId: 17,
      name: 'alpha',
      count: 2,
    });

    expect(preview).toBe('CustomModel {name: "alpha", count: 2}');
  });

  it('renders hook inline preview for function and circular tokens', () => {
    expect(buildHookInlinePreview({ __ecType: 'function', name: 'loadData' })).toBe(
      'loadData() {}',
    );
    expect(buildHookInlinePreview({ __ecType: 'circularRef', refId: 7 })).toBe('{…}');
  });

  it('renders set token preview with bounded entries', () => {
    const preview = buildHookInlinePreview({
      __ecType: 'set',
      size: 5,
      entries: [1, 2, 3, 4, 5],
    });

    expect(preview).toContain('Set(5)');
    expect(preview).toContain('1');
    expect(preview).toContain('2');
    expect(preview).toContain('3');
    expect(preview).toContain('…');
  });
});
