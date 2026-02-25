import { describe, expect, it } from 'vitest';
import { buildArrayPreview, buildObjectPreview } from '../../src/features/panel/reactInspector/jsonObjectPreview';

describe('jsonObjectPreview', () => {
  it('builds array preview with depth collapse and entry cap', () => {
    const budget = { remaining: 10 };
    const collapsed = buildArrayPreview({
      value: [1, 2, 3],
      depth: 2,
      budget,
      renderValue: () => 'x',
      maxDepth: 2,
      maxLen: 2,
      collapsedText: '[…]',
    });
    expect(collapsed).toBe('[…]');

    const expanded = buildArrayPreview({
      value: [1, 2, 3],
      depth: 0,
      budget: { remaining: 10 },
      renderValue: (value) => String(value),
      maxDepth: 2,
      maxLen: 2,
      collapsedText: '[…]',
    });
    expect(expanded).toBe('[1, 2, …]');
  });

  it('builds object preview while filtering internal keys', () => {
    const preview = buildObjectPreview({
      value: {
        __ecRefId: 10,
        a: 1,
        b: 2,
      },
      depth: 0,
      budget: { remaining: 10 },
      renderValue: (value) => String(value),
      maxDepth: 1,
      maxLen: 3,
      isInternalMetaKey: (key) => key === '__ecRefId',
      getObjectDisplayName: () => 'Model',
    });
    expect(preview).toBe('Model {a: 1, b: 2}');
  });
});
