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

  it('runs reactInspect -> reactInspectPath roundtrip with shared component id', () => {
    const targetElement = document.createElement('section');
    const rootFiber: Record<string, unknown> = {
      __id: 'cmp-root',
      tag: 0,
      memoizedProps: {
        profile: {
          name: 'alpha',
        },
      },
      child: null,
      sibling: null,
      return: null,
    };
    const fiberIdMap = new WeakMap<object, string>();

    const handlers = createPageAgentInspectHandlers({
      maxTraversal: 100,
      maxComponents: 20,
      buildCssSelector: vi.fn(() => 'section'),
      getElementPath: vi.fn(() => '/html/body/section'),
      resolveTargetElement: vi.fn(() => targetElement),
      findNearestFiber: vi.fn(() => ({ fiber: rootFiber, sourceElement: targetElement })),
      findAnyFiberInDocument: vi.fn(() => null),
      findRootFiber: vi.fn((fiber) => fiber),
      findPreferredSelectedFiber: vi.fn((fiber) => fiber),
      isInspectableTag: vi.fn(() => true),
      getFiberIdMap: vi.fn(() => fiberIdMap),
      getStableFiberId: vi.fn((fiber: Record<string, unknown> | null | undefined) => {
        if (!fiber || typeof fiber !== 'object') return null;
        const id = typeof fiber.__id === 'string' ? fiber.__id : null;
        if (id && !fiberIdMap.has(fiber)) fiberIdMap.set(fiber, id);
        return id;
      }),
      getFiberName: vi.fn(() => 'App'),
      getFiberKind: vi.fn(() => 'FunctionComponent'),
      getReactFiberFromElement: vi.fn(() => null),
      serializePropsForFiber: vi.fn(
        (fiber: Record<string, unknown> | null | undefined) => fiber?.memoizedProps ?? null,
      ),
      getHooksInfo: vi.fn(() => ({ value: [], count: 0 })),
      getHooksCount: vi.fn(() => 0),
      getHooksRootValue: vi.fn(() => ({ hooks: true })),
      resolveSpecialCollectionPathSegment: vi.fn(() => ({ handled: false })),
      makeSerializer: vi.fn(() => (value: unknown) => ({ serialized: value })),
      registerFunctionForInspect: vi.fn(() => 'fn-1'),
    });

    const inspectResult = handlers.inspectReactComponents({
      selector: 'section',
      includeSerializedData: true,
    }) as { components?: Array<{ id?: string }> };
    const componentId = inspectResult.components?.[0]?.id;
    expect(componentId).toBe('cmp-root');

    const inspectPathResult = handlers.inspectReactPath({
      componentId,
      selector: 'section',
      section: 'props',
      path: ['profile', 'name'],
      mode: 'serializeValue',
      serializeLimit: 5000,
    });

    expect(inspectPathResult).toEqual({
      ok: true,
      value: {
        serialized: 'alpha',
      },
    });
  });
});
