import { describe, expect, it } from 'vitest';
import {
  buildHookInlineTokenPreview,
  buildJsonSummaryTokenPreview,
} from '../../src/features/panel/reactInspector/jsonPreviewTokenStrategies';

describe('jsonPreviewTokenStrategies', () => {
  it('builds json summary token preview for function/circular/dehydrated values', () => {
    expect(buildJsonSummaryTokenPreview({ __ecType: 'function', name: 'fetchData' })).toBe(
      'function fetchData',
    );
    expect(buildJsonSummaryTokenPreview({ __ecType: 'circularRef', refId: 3 })).toBe(
      '[Circular #3]',
    );
    expect(buildJsonSummaryTokenPreview({ __ecType: 'dehydrated', valueType: 'set', size: 2 })).toBe(
      'Set(2)',
    );
    expect(buildJsonSummaryTokenPreview({ plain: true })).toBeNull();
  });

  it('builds hook inline token preview for function/circular/dehydrated values', () => {
    expect(buildHookInlineTokenPreview({ __ecType: 'function', name: 'mutate' })).toBe(
      'mutate() {}',
    );
    expect(buildHookInlineTokenPreview({ __ecType: 'function', name: '   ' })).toBe('() => {}');
    expect(buildHookInlineTokenPreview({ __ecType: 'circularRef', refId: 9 })).toBe('{…}');
    expect(buildHookInlineTokenPreview({ __ecType: 'dehydrated', valueType: 'map', size: 1 })).toBe(
      'Map(1)',
    );
  });
});
