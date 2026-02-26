import type { FiberLike } from "./pageAgentFiberSearchTypes";

interface ScanDocumentFiberRootsOptions<T> {
  maxScan: number;
  getReactFiberFromElement: (el: Element | null) => FiberLike | null;
  findRootFiber: (fiber: FiberLike) => FiberLike | null;
  onRootFiber: (rootFiber: FiberLike) => T | null;
}

/** document element를 BFS로 순회하며 중복 없는 root fiber를 방문한다. */
function scanDocumentFiberRoots<T>(options: ScanDocumentFiberRootsOptions<T>) {
  const { maxScan, getReactFiberFromElement, findRootFiber, onRootFiber } = options;

  const rootEl = document.body || document.documentElement;
  if (!rootEl) return null;

  const queue: Element[] = [rootEl];
  let cursor = 0;
  let guard = 0;
  const visitedRoots: WeakSet<FiberLike> | FiberLike[] =
    typeof WeakSet === "function" ? new WeakSet<FiberLike>() : [];

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
        const result = onRootFiber(rootFiber);
        if (result !== null) {
          return result;
        }
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

export { scanDocumentFiberRoots };
