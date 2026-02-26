// @ts-nocheck
import type { FiberLike } from "./pageAgentFiberSearchTypes";

interface RootHasComponentIdInTreeOptions {
  rootFiber: FiberLike | null | undefined;
  componentId: string | null | undefined;
  maxTraversal: number;
  isInspectableTag: (tag: number) => boolean;
  getStableFiberId: (
    fiber: FiberLike | null | undefined,
    map: WeakMap<object, string>,
  ) => string | null;
  fiberIdMap: WeakMap<object, string>;
}

interface FindFiberByComponentIdInTreeOptions {
  rootFiber: FiberLike | null | undefined;
  targetId: string | null | undefined;
  maxTraversal: number;
  isInspectableTag: (tag: number) => boolean;
  getStableFiberId: (
    fiber: FiberLike | null | undefined,
    map: WeakMap<object, string>,
  ) => string | null;
  fiberIdMap: WeakMap<object, string>;
}

/** root fiber subtree에 target component id가 존재하는지 검사한다. */
function rootHasComponentIdInTree(options: RootHasComponentIdInTreeOptions) {
  const {
    rootFiber,
    componentId,
    maxTraversal,
    isInspectableTag,
    getStableFiberId,
    fiberIdMap,
  } = options;

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

/** root fiber subtree에서 target component id에 해당하는 fiber를 찾는다. */
function findFiberByComponentIdInTree(options: FindFiberByComponentIdInTreeOptions) {
  const {
    rootFiber,
    targetId,
    maxTraversal,
    isInspectableTag,
    getStableFiberId,
    fiberIdMap,
  } = options;

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

export { rootHasComponentIdInTree, findFiberByComponentIdInTree };
