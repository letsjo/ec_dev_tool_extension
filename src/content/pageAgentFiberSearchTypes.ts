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
  getStableFiberId: (
    fiber: FiberLike | null | undefined,
    map: WeakMap<object, string>,
  ) => string | null;
  getReactFiberFromElement: (el: Element | null) => FiberLike | null;
  findRootFiber: (fiber: FiberLike) => FiberLike | null;
}

export type {
  AnyRecord,
  FiberLike,
  CreatePageAgentFiberSearchHelpersOptions,
};
