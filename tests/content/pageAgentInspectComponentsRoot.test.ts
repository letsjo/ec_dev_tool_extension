import { describe, expect, it, vi } from 'vitest';
import { resolveInspectComponentsRootContext } from '../../src/content/pageAgentInspectComponentsRoot';

describe('pageAgentInspectComponentsRoot', () => {
  it('returns missing-nearest error when root context cannot resolve fiber', () => {
    const result = resolveInspectComponentsRootContext({
      selector: '#missing',
      pickPoint: { x: 1, y: 2 },
      selectedComponentId: null,
      includeSerializedData: true,
      resolveTargetElement: () => null,
      findNearestFiber: () => null,
      findAnyFiberInDocument: () => null,
      findRootFiber: () => null,
      getFiberIdMap: () => new WeakMap<object, string>(),
      rootHasComponentId: () => false,
      findRootFiberByComponentId: () => null,
    });

    expect(result).toEqual({
      ok: false,
      error: 'React fiber를 찾을 수 없습니다. (React 16+ 필요)',
      selector: '#missing',
      pickPoint: { x: 1, y: 2 },
    });
  });

  it('applies fallback root lookup when lightweight refresh misses selected id', () => {
    const initialRoot = { key: 'root-a', tag: 0 };
    const matchedRoot = { key: 'root-b', tag: 0 };
    const targetElement = document.createElement('div');

    const result = resolveInspectComponentsRootContext({
      selector: '',
      pickPoint: undefined,
      selectedComponentId: 'cmp-42',
      includeSerializedData: false,
      resolveTargetElement: () => targetElement,
      findNearestFiber: () => ({
        fiber: initialRoot,
        sourceElement: targetElement,
      }),
      findAnyFiberInDocument: () => null,
      findRootFiber: () => initialRoot,
      getFiberIdMap: () => new WeakMap<object, string>(),
      rootHasComponentId: vi.fn(() => false),
      findRootFiberByComponentId: vi.fn(() => matchedRoot),
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.rootFiber).toBe(matchedRoot);
      expect(result.targetEl).toBe(targetElement);
      expect(result.nearest.fiber).toBe(initialRoot);
    }
  });
});
