type FiberLike = {
  tag?: number;
  type?: unknown;
  elementType?: unknown;
  return?: FiberLike | null;
  child?: FiberLike | null;
  sibling?: FiberLike | null;
  alternate?: FiberLike | null;
  stateNode?: unknown;
  memoizedState?: unknown;
  memoizedProps?: unknown;
  ref?: unknown;
  _debugHookTypes?: unknown[];
  [key: string]: unknown;
};

interface CreatePageAgentFiberSearchHelpersOptions {
  maxTraversal: number;
  isInspectableTag: (tag: number) => boolean;
  getStableFiberId: (
    fiber: FiberLike | null | undefined,
    map: WeakMap<object, string>,
  ) => string | null;
  getReactFiberFromElement: (el: Element | null) => FiberLike | null;
  findRootFiber: (fiber: FiberLike) => FiberLike | null;
}

export type {
  FiberLike,
  CreatePageAgentFiberSearchHelpersOptions,
};
