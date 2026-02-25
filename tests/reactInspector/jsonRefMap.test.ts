import { describe, expect, it } from 'vitest';
import { collectJsonRefMap } from '../../src/features/panel/reactInspector/jsonRefMap';

describe('jsonRefMap', () => {
  it('collects ref ids from nested objects and arrays', () => {
    const value = {
      __ecRefId: 1,
      data: [{ __ecRefId: 2 }, { nested: { __ecRefId: 3 } }],
    };

    const refMap = collectJsonRefMap(value);

    expect(refMap.get(1)).toBe(value);
    expect(refMap.get(2)).toBe(value.data[0]);
    expect(refMap.get(3)).toBe((value.data[1] as { nested: unknown }).nested);
  });

  it('skips internal meta keys and handles circular references safely', () => {
    const hidden = { __ecRefId: 99 };
    const parent: Record<string, unknown> = { __ecRefId: 10, __ecObjectClassName: hidden };
    const child: Record<string, unknown> = { __ecRefId: 11, parent };
    parent.child = child;

    const refMap = collectJsonRefMap(parent);

    expect(refMap.has(99)).toBe(false);
    expect(refMap.get(10)).toBe(parent);
    expect(refMap.get(11)).toBe(child);
    expect(refMap.size).toBe(2);
  });
});
