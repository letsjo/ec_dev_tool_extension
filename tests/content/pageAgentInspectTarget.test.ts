import { describe, expect, it, vi } from 'vitest';
import {
  resolveInspectPathTargetFiber,
  resolveInspectRootContext,
} from '../../src/content/pageAgentInspectTarget';

describe('pageAgentInspectTarget', () => {
  it('resolves root context using document fallback when nearest fiber is missing', () => {
    const targetEl = document.createElement('div');
    const fallbackNearest = {
      fiber: { id: 'fallback-fiber' },
      sourceElement: null,
    };

    const result = resolveInspectRootContext({
      selector: '#target',
      pickPoint: null,
      resolveTargetElement: vi.fn(() => targetEl),
      findNearestFiber: vi.fn(() => null),
      findAnyFiberInDocument: vi.fn(() => fallbackNearest),
      findRootFiber: vi.fn((fiber) => ({
        id: 'root',
        child: fiber,
      })),
    });

    expect(result).toEqual({
      ok: true,
      targetEl,
      nearest: fallbackNearest,
      rootFiber: {
        id: 'root',
        child: fallbackNearest.fiber,
      },
    });
  });

  it('falls back to document-wide target fiber search when root search misses', () => {
    const rootFiber = { id: 'root' };
    const fallbackFiber = { id: 'fallback-target' };
    const findFiberByComponentId = vi.fn(() => null);
    const findFiberByComponentIdAcrossDocument = vi.fn(() => fallbackFiber);

    const result = resolveInspectPathTargetFiber({
      rootFiber,
      componentId: 'cmp-1',
      fiberIdMap: new WeakMap<object, string>(),
      findFiberByComponentId,
      findFiberByComponentIdAcrossDocument,
    });

    expect(result).toBe(fallbackFiber);
    expect(findFiberByComponentId).toHaveBeenCalledWith(
      rootFiber,
      'cmp-1',
      expect.any(WeakMap),
    );
    expect(findFiberByComponentIdAcrossDocument).toHaveBeenCalledWith(
      'cmp-1',
      expect.any(WeakMap),
    );
  });
});
