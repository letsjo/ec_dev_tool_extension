// @ts-nocheck
type AnyRecord = Record<string, any>;

type FiberLike = AnyRecord & {
  tag?: number;
  type?: any;
  elementType?: any;
  return?: FiberLike | null;
  child?: FiberLike | null;
  sibling?: FiberLike | null;
  alternate?: FiberLike | null;
  stateNode?: any;
  memoizedState?: any;
  memoizedProps?: any;
  ref?: any;
  _debugHookTypes?: unknown[];
};

interface CreatePageAgentFiberSearchHelpersOptions {
  maxTraversal: number;
  isInspectableTag: (tag: number) => boolean;
  getStableFiberId: (fiber: FiberLike | null | undefined, map: WeakMap<object, string>) => string | null;
  getReactFiberFromElement: (el: Element | null) => FiberLike | null;
  findRootFiber: (fiber: FiberLike) => FiberLike | null;
}

/** componentId 기반 fiber/root 탐색 유틸을 구성한다. */
export function createPageAgentFiberSearchHelpers(options: CreatePageAgentFiberSearchHelpersOptions) {
  const {
    maxTraversal,
    isInspectableTag,
    getStableFiberId,
    getReactFiberFromElement,
    findRootFiber,
  } = options;

  /** 해당 root tree에 componentId가 존재하는지 확인 */
  function rootHasComponentId(rootFiber: FiberLike | null | undefined, componentId: string | null | undefined, fiberIdMap: WeakMap<object, string>) {
    if (!rootFiber || !componentId) return false;
    const stack = [rootFiber];
    let guard = 0;
    while (stack.length > 0 && guard < maxTraversal) {
      const node = stack.pop();
      if (!node) {
        guard += 1;
        continue;
      }
      if (isInspectableTag(node.tag)) {
        const stableId = getStableFiberId(node, fiberIdMap);
        if (stableId === componentId) {
          return true;
        }
      }
      if (node.sibling) stack.push(node.sibling);
      if (node.child) stack.push(node.child);
      guard += 1;
    }
    return false;
  }

  /** 문서 전체를 스캔해 componentId를 포함하는 root fiber를 찾는다. */
  function findRootFiberByComponentId(componentId: string | null | undefined, fiberIdMap: WeakMap<object, string>) {
    if (!componentId) return null;
    const rootEl = document.body || document.documentElement;
    if (!rootEl) return null;

    const queue = [rootEl];
    let cursor = 0;
    let guard = 0;
    const maxScan = 7000;
    const visitedRoots = typeof WeakSet === "function" ? new WeakSet() : [];

    function hasVisited(root: FiberLike | null | undefined) {
      if (!root) return true;
      if (visitedRoots instanceof WeakSet) return visitedRoots.has(root);
      for (let i = 0; i < visitedRoots.length; i += 1) {
        if (visitedRoots[i] === root) return true;
      }
      return false;
    }

    function markVisited(root: FiberLike | null | undefined) {
      if (!root) return;
      if (visitedRoots instanceof WeakSet) {
        visitedRoots.add(root);
        return;
      }
      visitedRoots.push(root);
    }

    while (cursor < queue.length && guard < maxScan) {
      const current = queue[cursor++];
      const fiber = getReactFiberFromElement(current);
      if (fiber) {
        const rootFiber = findRootFiber(fiber);
        if (rootFiber && !hasVisited(rootFiber)) {
          markVisited(rootFiber);
          if (rootHasComponentId(rootFiber, componentId, fiberIdMap)) {
            return rootFiber;
          }
        }
      }

      const children = current.children;
      if (children && children.length) {
        for (let c = 0; c < children.length; c += 1) {
          queue.push(children[c]);
        }
      }
      guard += 1;
    }

    return null;
  }

  /** root tree 내부에서 componentId로 fiber를 찾는다. */
  function findFiberByComponentId(rootFiber: FiberLike | null | undefined, targetId: string | null | undefined, fiberIdMap: WeakMap<object, string>) {
    if (!rootFiber || !targetId) return null;
    const stack = [rootFiber];
    let guard = 0;
    let inspectableIndex = 0;

    while (stack.length > 0 && guard < maxTraversal) {
      const node = stack.pop();
      if (!node) {
        guard += 1;
        continue;
      }
      if (isInspectableTag(node.tag)) {
        const legacyId = String(inspectableIndex);
        const stableId = getStableFiberId(node, fiberIdMap);
        if (stableId === targetId || legacyId === targetId) return node;
        inspectableIndex += 1;
      }
      if (node.sibling) stack.push(node.sibling);
      if (node.child) stack.push(node.child);
      guard += 1;
    }

    return null;
  }

  /** 현재 root에서 못 찾은 경우 문서 전체 root를 스캔해 componentId fiber를 찾는다. */
  function findFiberByComponentIdAcrossDocument(targetId: string | null | undefined, fiberIdMap: WeakMap<object, string>) {
    if (!targetId) return null;
    const rootEl = document.body || document.documentElement;
    if (!rootEl) return null;

    const queue = [rootEl];
    let cursor = 0;
    let guard = 0;
    const maxScan = 8000;
    const visitedRoots = typeof WeakSet === "function" ? new WeakSet() : [];

    function hasVisited(root: FiberLike | null | undefined) {
      if (!root) return true;
      if (visitedRoots instanceof WeakSet) return visitedRoots.has(root);
      for (let i = 0; i < visitedRoots.length; i += 1) {
        if (visitedRoots[i] === root) return true;
      }
      return false;
    }

    function markVisited(root: FiberLike | null | undefined) {
      if (!root) return;
      if (visitedRoots instanceof WeakSet) {
        visitedRoots.add(root);
        return;
      }
      visitedRoots.push(root);
    }

    while (cursor < queue.length && guard < maxScan) {
      const current = queue[cursor++];
      const fiber = getReactFiberFromElement(current);
      if (fiber) {
        const rootFiber = findRootFiber(fiber);
        if (rootFiber && !hasVisited(rootFiber)) {
          markVisited(rootFiber);
          const found = findFiberByComponentId(rootFiber, targetId, fiberIdMap);
          if (found) return found;
        }
      }

      const children = current.children;
      if (children && children.length) {
        for (let i = 0; i < children.length; i += 1) {
          queue.push(children[i]);
        }
      }
      guard += 1;
    }

    return null;
  }

  return {
    rootHasComponentId,
    findRootFiberByComponentId,
    findFiberByComponentId,
    findFiberByComponentIdAcrossDocument,
  };
}
