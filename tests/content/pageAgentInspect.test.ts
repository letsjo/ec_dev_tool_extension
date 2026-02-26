import { describe, expect, it, vi } from 'vitest';
import { createPageAgentInspectHandlers } from '../../src/content/pageAgentInspect';

describe('pageAgentInspect', () => {
  it('creates inspect handlers and returns guard errors on missing targets', () => {
    const handlers = createPageAgentInspectHandlers({
      maxTraversal: 100,
      maxComponents: 20,
      buildCssSelector: vi.fn(() => ''),
      getElementPath: vi.fn(() => ''),
      resolveTargetElement: vi.fn(() => null),
      findNearestFiber: vi.fn(() => null),
      findAnyFiberInDocument: vi.fn(() => null),
      findRootFiber: vi.fn(() => null),
      findPreferredSelectedFiber: vi.fn(() => null),
      isInspectableTag: vi.fn(() => true),
      getFiberIdMap: vi.fn(() => new WeakMap<object, string>()),
      getStableFiberId: vi.fn(() => null),
      getFiberName: vi.fn(() => 'Unknown'),
      getFiberKind: vi.fn(() => 'Unknown'),
      getReactFiberFromElement: vi.fn(() => null),
      serializePropsForFiber: vi.fn(() => null),
      getHooksInfo: vi.fn(() => ({ value: null, count: 0 })),
      getHooksCount: vi.fn(() => 0),
      getHooksRootValue: vi.fn(() => null),
      resolveSpecialCollectionPathSegment: vi.fn(() => ({})),
      makeSerializer: vi.fn(() => (value: unknown) => value),
      registerFunctionForInspect: vi.fn(() => 'fn-1'),
    });

    expect(handlers.inspectReactComponents({ selector: '#missing' })).toEqual({
      error: 'React fiber를 찾을 수 없습니다. (React 16+ 필요)',
      selector: '#missing',
      pickPoint: undefined,
    });
    expect(handlers.inspectReactPath({})).toEqual({
      ok: false,
      error: 'componentId가 필요합니다.',
    });
  });
});
