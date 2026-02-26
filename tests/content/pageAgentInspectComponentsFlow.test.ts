import { describe, expect, it, vi } from 'vitest';
import { parseInspectReactComponentsArgs } from '../../src/content/inspect/components/pageAgentInspectComponentsArgs';
import { buildSourceElementSummary } from '../../src/content/inspect/components/pageAgentInspectComponentsSource';
import { createInspectReactComponentsFlow } from '../../src/content/inspect/components/pageAgentInspectComponentsFlow';
import type { ReactComponentInfo } from '../../src/shared/inspector';

describe('pageAgentInspectComponentsFlow', () => {
  const buildCssSelector = (element: Element | null) => {
    if (!element) return '';
    const id = (element as HTMLElement).id;
    const tagName = element.tagName.toLowerCase();
    return id ? `${tagName}#${id}` : tagName;
  };

  const getElementPath = (element: Element | null) => {
    if (!element) return '';
    const parts: string[] = [];
    let cursor: Element | null = element;
    while (cursor && parts.length < 8) {
      const id = (cursor as HTMLElement).id;
      parts.unshift(`${cursor.tagName.toLowerCase()}${id ? `#${id}` : ''}`);
      cursor = cursor.parentElement;
    }
    return parts.join(' > ');
  };

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
      buildCssSelector,
      getElementPath,
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
        sourceElement: {
          selector: 'section',
          domPath: 'section',
          tagName: 'section',
        },
      }),
    );
    const components = (result as { components?: unknown[] }).components;
    expect(Array.isArray(components)).toBe(true);
    expect((result as { rootSummary: { totalComponents: number } }).rootSummary.totalComponents).toBe(
      (components ?? []).length,
    );
  });

  it('returns missing-nearest error when no fiber can be resolved', () => {
    const inspectReactComponents = createInspectReactComponentsFlow({
      maxTraversal: 100,
      maxComponents: 20,
      buildCssSelector,
      getElementPath,
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

  it('falls back to DOM chain when React fiber is missing but target element exists', () => {
    const target = document.createElement('input');
    target.id = 'project-name';
    document.body.appendChild(target);

    const inspectReactComponents = createInspectReactComponentsFlow({
      maxTraversal: 100,
      maxComponents: 20,
      buildCssSelector,
      getElementPath,
      resolveTargetElement: vi.fn(() => target),
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

    const result = inspectReactComponents({ selector: '#project-name' }) as {
      selectedIndex: number;
      rootSummary: { totalComponents: number };
      components: ReactComponentInfo[];
    };

    expect(Array.isArray(result.components)).toBe(true);
    expect(result.components.length).toBeGreaterThanOrEqual(1);
    expect(result.selectedIndex).toBe(result.components.length - 1);
    expect(result.rootSummary.totalComponents).toBe(result.components.length);
    expect(result.components[result.selectedIndex].kind).toBe('DomElement');
    expect(result.components[result.selectedIndex].domSelector).toContain('#project-name');

    target.remove();
  });

  it('appends DOM leaf fallback when target is not mapped to React component domPath', () => {
    const target = document.createElement('button');
    target.id = 'leaf-target';
    document.body.appendChild(target);
    const rootFiber = { tag: 0 };

    const inspectReactComponents = createInspectReactComponentsFlow({
      maxTraversal: 100,
      maxComponents: 20,
      buildCssSelector,
      getElementPath,
      resolveTargetElement: vi.fn(() => target),
      findNearestFiber: vi.fn(() => ({ fiber: rootFiber, sourceElement: target })),
      findAnyFiberInDocument: vi.fn(() => null),
      findRootFiber: vi.fn(() => rootFiber),
      findPreferredSelectedFiber: vi.fn((fiber) => fiber),
      getFiberIdMap: vi.fn(() => new WeakMap<object, string>()),
      rootHasComponentId: vi.fn(() => true),
      findRootFiberByComponentId: vi.fn(() => null),
      isInspectableTag: vi.fn(() => true),
      getStableFiberId: vi.fn(() => 'cmp-root'),
      getHooksInfo: vi.fn(() => ({ value: [], count: 0 })),
      getHooksCount: vi.fn(() => 0),
      serializePropsForFiber: vi.fn(() => ({ ready: true })),
      makeSerializer: vi.fn(() => (value: unknown) => value),
      getFiberName: vi.fn(() => 'App'),
      getFiberKind: vi.fn(() => 'FunctionComponent'),
    });

    const result = inspectReactComponents({
      selector: '#leaf-target',
      includeSerializedData: true,
    }) as {
      selectedIndex: number;
      components: ReactComponentInfo[];
    };

    expect(result.components).toHaveLength(2);
    expect(result.components[0].kind).toBe('FunctionComponent');
    expect(result.components[1].kind).toBe('DomElement');
    expect(result.selectedIndex).toBe(1);
    expect(result.components[1].domSelector).toContain('#leaf-target');

    target.remove();
  });
});
