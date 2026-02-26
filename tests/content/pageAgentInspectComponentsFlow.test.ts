import { describe, expect, it, vi } from 'vitest';
import { parseInspectReactComponentsArgs } from '../../src/content/pageAgentInspectComponentsArgs';
import { buildSourceElementSummary } from '../../src/content/pageAgentInspectComponentsSource';
import { createInspectReactComponentsFlow } from '../../src/content/pageAgentInspectComponentsFlow';

describe('pageAgentInspectComponentsFlow', () => {
  it('normalizes inspect component args from unknown input', () => {
    expect(parseInspectReactComponentsArgs(null)).toEqual({
      selector: '',
      pickPoint: undefined,
      includeSerializedData: true,
      selectedComponentId: null,
    });
    expect(
      parseInspectReactComponentsArgs({
        selector: '#app',
        pickPoint: { x: 10, y: 22 },
        includeSerializedData: false,
        selectedComponentId: 'cmp-10',
      }),
    ).toEqual({
      selector: '#app',
      pickPoint: { x: 10, y: 22 },
      includeSerializedData: false,
      selectedComponentId: 'cmp-10',
    });
  });

  it('builds source element summary only when source element exists', () => {
    expect(
      buildSourceElementSummary({
        sourceElement: null,
        buildCssSelector: () => 'unused',
        getElementPath: () => 'unused',
      }),
    ).toBeNull();

    const sourceElement = document.createElement('article');
    expect(
      buildSourceElementSummary({
        sourceElement,
        buildCssSelector: () => 'article',
        getElementPath: () => '/html/body/article',
      }),
    ).toEqual({
      selector: 'article',
      domPath: '/html/body/article',
      tagName: 'article',
    });
  });

  it('returns inspect result payload with source summary and selected index', () => {
    const rootFiber = { tag: 0 };
    const sourceElement = document.createElement('section');
    const inspectReactComponents = createInspectReactComponentsFlow({
      maxTraversal: 100,
      maxComponents: 20,
      buildCssSelector: () => 'section',
      getElementPath: () => '/html/body/section',
      resolveTargetElement: vi.fn(() => sourceElement),
      findNearestFiber: vi.fn(() => ({ fiber: rootFiber, sourceElement })),
      findAnyFiberInDocument: vi.fn(() => null),
      findRootFiber: vi.fn((fiber) => fiber),
      findPreferredSelectedFiber: vi.fn((fiber) => fiber),
      getFiberIdMap: vi.fn(() => new WeakMap<object, string>()),
      rootHasComponentId: vi.fn(() => true),
      findRootFiberByComponentId: vi.fn(() => null),
      isInspectableTag: vi.fn(() => true),
      getStableFiberId: vi.fn(() => 'cmp-1'),
      getHooksInfo: vi.fn(() => ({ value: [], count: 0 })),
      getHooksCount: vi.fn(() => 0),
      serializePropsForFiber: vi.fn(() => ({ enabled: true })),
      makeSerializer: vi.fn(() => (value: unknown) => value),
      getFiberName: vi.fn(() => 'App'),
      getFiberKind: vi.fn(() => 'FunctionComponent'),
    });

    const result = inspectReactComponents({ selector: '#app', includeSerializedData: true });

    expect(result).toEqual(
      expect.objectContaining({
        selector: '#app',
        selectedIndex: 0,
        sourceElement: {
          selector: 'section',
          domPath: '/html/body/section',
          tagName: 'section',
        },
        rootSummary: { totalComponents: 1 },
      }),
    );
    expect(Array.isArray((result as { components?: unknown[] }).components)).toBe(true);
  });

  it('returns missing-nearest error when no fiber can be resolved', () => {
    const inspectReactComponents = createInspectReactComponentsFlow({
      maxTraversal: 100,
      maxComponents: 20,
      buildCssSelector: () => '',
      getElementPath: () => '',
      resolveTargetElement: vi.fn(() => null),
      findNearestFiber: vi.fn(() => null),
      findAnyFiberInDocument: vi.fn(() => null),
      findRootFiber: vi.fn(() => null),
      findPreferredSelectedFiber: vi.fn(() => null),
      getFiberIdMap: vi.fn(() => new WeakMap<object, string>()),
      rootHasComponentId: vi.fn(() => false),
      findRootFiberByComponentId: vi.fn(() => null),
      isInspectableTag: vi.fn(() => true),
      getStableFiberId: vi.fn(() => null),
      getHooksInfo: vi.fn(() => ({ value: null, count: 0 })),
      getHooksCount: vi.fn(() => 0),
      serializePropsForFiber: vi.fn(() => null),
      makeSerializer: vi.fn(() => (value: unknown) => value),
      getFiberName: vi.fn(() => 'Unknown'),
      getFiberKind: vi.fn(() => 'Unknown'),
    });

    expect(inspectReactComponents({ selector: '#not-found' })).toEqual({
      error: 'React fiber를 찾을 수 없습니다. (React 16+ 필요)',
      selector: '#not-found',
      pickPoint: undefined,
    });
  });
});
