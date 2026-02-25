import { describe, expect, it, vi } from 'vitest';
import { createPageAgentInspectHandlers } from '../../src/content/pageAgentInspect';

type AnyRecord = Record<string, any>;

interface InspectPathHarnessOptions {
  componentId?: string;
  memoizedProps?: AnyRecord;
  hooksRootValue?: AnyRecord;
  resolveSpecialCollectionPathSegment?: ReturnType<typeof vi.fn>;
}

function createInspectPathHarness(options: InspectPathHarnessOptions = {}) {
  const componentId = options.componentId ?? 'cmp-root';
  const rootFiber = {
    tag: 0,
    __id: componentId,
    memoizedProps: options.memoizedProps ?? {
      profile: {
        name: 'alpha',
      },
    },
  } as AnyRecord;
  const targetEl = document.createElement('div');
  const fiberIdMap = new WeakMap<object, string>();
  const hooksRootValue =
    options.hooksRootValue ??
    ({
      actions: {
        reload() {
          return 'ok';
        },
      },
    } as AnyRecord);

  const resolveSpecialCollectionPathSegment =
    options.resolveSpecialCollectionPathSegment ??
    vi.fn((_currentValue: unknown, _segment: string) => ({ handled: false }));

  const makeSerializer = vi.fn(() => (value: unknown) => ({ serialized: value }));
  const registerFunctionForInspect = vi.fn(() => 'inspect-ref-1');

  const handlers = createPageAgentInspectHandlers({
    maxTraversal: 50,
    maxComponents: 50,
    buildCssSelector: vi.fn(() => '#target'),
    getElementPath: vi.fn(() => 'html > body > #target'),
    resolveTargetElement: vi.fn(() => targetEl),
    findNearestFiber: vi.fn(() => ({
      fiber: rootFiber,
      sourceElement: targetEl,
    })),
    findAnyFiberInDocument: vi.fn(() => null),
    findRootFiber: vi.fn((fiber: AnyRecord) => fiber),
    findPreferredSelectedFiber: vi.fn(() => rootFiber),
    isInspectableTag: vi.fn(() => true),
    getFiberIdMap: vi.fn(() => fiberIdMap),
    getStableFiberId: vi.fn((fiber: AnyRecord | null | undefined, map: WeakMap<object, string>) => {
      if (!fiber || typeof fiber !== 'object') return null;
      const id = typeof fiber.__id === 'string' ? fiber.__id : null;
      if (id && !map.has(fiber)) map.set(fiber, id);
      return id;
    }),
    getFiberName: vi.fn(() => 'Component'),
    getFiberKind: vi.fn(() => 'function'),
    getReactFiberFromElement: vi.fn(() => null),
    serializePropsForFiber: vi.fn(() => ({})),
    getHooksInfo: vi.fn(() => ({ value: hooksRootValue, count: 0 })),
    getHooksCount: vi.fn(() => 0),
    getHooksRootValue: vi.fn(() => hooksRootValue),
    resolveSpecialCollectionPathSegment,
    makeSerializer,
    registerFunctionForInspect,
  });

  return {
    handlers,
    makeSerializer,
    registerFunctionForInspect,
    resolveSpecialCollectionPathSegment,
  };
}

describe('inspectReactPath flow', () => {
  it('serializes props path with serializer mode', () => {
    const { handlers, makeSerializer } = createInspectPathHarness();

    const result = handlers.inspectReactPath({
      componentId: 'cmp-root',
      selector: '#target',
      section: 'props',
      path: ['profile', 'name'],
      mode: 'serializeValue',
      serializeLimit: 5000,
    });

    expect(result).toEqual({
      ok: true,
      value: {
        serialized: 'alpha',
      },
    });
    expect(makeSerializer).toHaveBeenCalledWith(
      expect.objectContaining({
        maxSerializeCalls: 5000,
      }),
    );
  });

  it('returns inspect ref when hook path resolves to function', () => {
    const { handlers, registerFunctionForInspect } = createInspectPathHarness();

    const result = handlers.inspectReactPath({
      componentId: 'cmp-root',
      selector: '#target',
      section: 'hooks',
      path: ['actions', 'reload'],
      mode: 'inspectFunction',
    });

    expect(result).toEqual({
      ok: true,
      name: 'reload',
      inspectRefKey: 'inspect-ref-1',
    });
    expect(registerFunctionForInspect).toHaveBeenCalledTimes(1);
  });

  it('returns error when inspectFunction mode points to non-function value', () => {
    const { handlers } = createInspectPathHarness({
      hooksRootValue: {
        value: 123,
      },
    });

    const result = handlers.inspectReactPath({
      componentId: 'cmp-root',
      selector: '#target',
      section: 'hooks',
      path: ['value'],
      mode: 'inspectFunction',
    });

    expect(result).toEqual({
      ok: false,
      error: '선택 값이 함수가 아닙니다.',
      valueType: 'number',
    });
  });

  it('returns path resolution error when nested value is missing', () => {
    const { handlers } = createInspectPathHarness({
      memoizedProps: {
        profile: null,
      },
    });

    const result = handlers.inspectReactPath({
      componentId: 'cmp-root',
      selector: '#target',
      section: 'props',
      path: ['profile', 'name'],
      mode: 'serializeValue',
    });

    expect(result).toEqual({
      ok: false,
      error: '함수 경로가 유효하지 않습니다.',
      failedAt: 'name',
    });
  });

  it('uses special collection segment resolver during path traversal', () => {
    const resolveSpecialCollectionPathSegment = vi.fn(
      (currentValue: unknown, segment: string) => {
        if (
          segment === '__ec_map_entry__0' &&
          typeof currentValue === 'object' &&
          currentValue !== null
        ) {
          return {
            handled: true,
            ok: true,
            value: 'mapped-entry',
          };
        }
        return { handled: false };
      },
    );
    const { handlers } = createInspectPathHarness({
      memoizedProps: {
        mapEntries: {},
      },
      resolveSpecialCollectionPathSegment,
    });

    const result = handlers.inspectReactPath({
      componentId: 'cmp-root',
      selector: '#target',
      section: 'props',
      path: ['mapEntries', '__ec_map_entry__0'],
      mode: 'serializeValue',
    });

    expect(result).toEqual({
      ok: true,
      value: {
        serialized: 'mapped-entry',
      },
    });
    expect(resolveSpecialCollectionPathSegment).toHaveBeenCalledWith(
      expect.any(Object),
      '__ec_map_entry__0',
    );
  });
});
