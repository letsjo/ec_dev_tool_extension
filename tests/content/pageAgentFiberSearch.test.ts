import { describe, expect, it } from 'vitest';
import { createPageAgentFiberSearchHelpers } from '../../src/content/fiber/pageAgentFiberSearch';

type AnyRecord = Record<string, any>;

type FiberLike = AnyRecord & {
  tag?: number;
  return?: FiberLike | null;
  child?: FiberLike | null;
  sibling?: FiberLike | null;
  __id?: string;
};

function createFiber(id: string | null, tag = 0) {
  return {
    tag,
    __id: id,
    return: null,
    child: null,
    sibling: null,
  } as FiberLike;
}

function connectParent(parent: FiberLike, ...children: FiberLike[]) {
  if (!children.length) return;
  parent.child = children[0];
  for (let i = 0; i < children.length; i += 1) {
    children[i].return = parent;
    children[i].sibling = children[i + 1] ?? null;
  }
}

function createHarness() {
  const elementFiberMap = new WeakMap<Element, FiberLike>();

  const helpers = createPageAgentFiberSearchHelpers({
    maxTraversal: 100,
    isInspectableTag: (tag: number) => tag === 0,
    getStableFiberId: (fiber: FiberLike | null | undefined, map: WeakMap<object, string>) => {
      if (!fiber || !fiber.__id) return null;
      if (!map.has(fiber)) {
        map.set(fiber, fiber.__id);
      }
      return map.get(fiber) ?? null;
    },
    getReactFiberFromElement: (el: Element | null) => {
      if (!el) return null;
      return elementFiberMap.get(el) ?? null;
    },
    findRootFiber: (fiber: FiberLike) => {
      let current: FiberLike | null = fiber;
      while (current && current.return) {
        current = current.return;
      }
      return current;
    },
  });

  return {
    helpers,
    bind(el: Element, fiber: FiberLike) {
      elementFiberMap.set(el, fiber);
    },
  };
}

describe('pageAgentFiberSearch', () => {
  it('finds component id inside a root tree', () => {
    const { helpers } = createHarness();
    const root = createFiber('root');
    const child = createFiber('child-1');
    connectParent(root, child);

    const fiberIdMap = new WeakMap<object, string>();
    expect(helpers.rootHasComponentId(root, 'child-1', fiberIdMap)).toBe(true);
    expect(helpers.rootHasComponentId(root, 'missing', fiberIdMap)).toBe(false);
  });

  it('supports legacy index fallback while searching a root tree', () => {
    const { helpers } = createHarness();
    const root = createFiber('root');
    const first = createFiber('first');
    const second = createFiber('second');
    connectParent(root, first, second);

    const fiberIdMap = new WeakMap<object, string>();
    const foundByLegacyIndex = helpers.findFiberByComponentId(root, '1', fiberIdMap);
    expect(foundByLegacyIndex).toBe(first);
  });

  it('skips fibers whose tag is not inspectable number', () => {
    const { helpers } = createHarness();
    const root = createFiber('root');
    const nonInspectable = createFiber('hidden-target');
    nonInspectable.tag = undefined;
    const inspectable = createFiber('visible-target');
    connectParent(root, nonInspectable, inspectable);

    const fiberIdMap = new WeakMap<object, string>();
    expect(helpers.rootHasComponentId(root, 'hidden-target', fiberIdMap)).toBe(false);
    expect(helpers.findFiberByComponentId(root, 'hidden-target', fiberIdMap)).toBeNull();
    expect(helpers.findFiberByComponentId(root, 'visible-target', fiberIdMap)).toBe(
      inspectable,
    );
  });

  it('scans document roots and returns matching root by component id', () => {
    const { helpers, bind } = createHarness();
    const container = document.createElement('div');
    const hostA = document.createElement('div');
    const hostB = document.createElement('div');
    container.append(hostA, hostB);
    document.body.appendChild(container);

    const rootA = createFiber('root-A');
    const rootAChild = createFiber('alpha');
    connectParent(rootA, rootAChild);

    const rootB = createFiber('root-B');
    const rootBChild = createFiber('target-id');
    connectParent(rootB, rootBChild);

    bind(hostA, rootAChild);
    bind(hostB, rootBChild);

    const fiberIdMap = new WeakMap<object, string>();
    const foundRoot = helpers.findRootFiberByComponentId('target-id', fiberIdMap);
    expect(foundRoot).toBe(rootB);

    container.remove();
  });

  it('scans document roots and returns matching fiber across roots', () => {
    const { helpers, bind } = createHarness();
    const container = document.createElement('div');
    const hostA = document.createElement('div');
    const hostB = document.createElement('div');
    container.append(hostA, hostB);
    document.body.appendChild(container);

    const rootA = createFiber('root-A');
    const rootAChild = createFiber('alpha');
    connectParent(rootA, rootAChild);

    const rootB = createFiber('root-B');
    const rootBChild = createFiber('target-id');
    connectParent(rootB, rootBChild);

    bind(hostA, rootAChild);
    bind(hostB, rootBChild);

    const fiberIdMap = new WeakMap<object, string>();
    const foundFiber = helpers.findFiberByComponentIdAcrossDocument('target-id', fiberIdMap);
    expect(foundFiber).toBe(rootBChild);

    container.remove();
  });
});
