// @ts-nocheck
import { createPageAgentFiberSearchHelpers } from "./pageAgentFiberSearch";
import { createInspectReactComponentsFlow } from "./pageAgentInspectComponentsFlow";
import { createInspectReactPathFlow } from "./pageAgentInspectPathFlow";

type AnyRecord = Record<string, any>;
type PickPoint = { x: number; y: number };

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

interface CreatePageAgentInspectHandlersOptions {
  maxTraversal: number;
  maxComponents: number;
  buildCssSelector: (el: Element | null) => string;
  getElementPath: (el: Element | null) => string;
  resolveTargetElement: (selector: string, pickPoint: PickPoint | null | undefined) => Element | null;
  findNearestFiber: (startEl: Element | null) => { fiber: FiberLike; sourceElement: Element | null } | null;
  findAnyFiberInDocument: () => { fiber: FiberLike; sourceElement: Element | null } | null;
  findRootFiber: (fiber: FiberLike) => FiberLike | null;
  findPreferredSelectedFiber: (startFiber: FiberLike) => FiberLike | null;
  isInspectableTag: (tag: number) => boolean;
  getFiberIdMap: () => WeakMap<object, string>;
  getStableFiberId: (fiber: FiberLike | null | undefined, map: WeakMap<object, string>) => string | null;
  getFiberName: (fiber: FiberLike) => string;
  getFiberKind: (tag: number) => string;
  getReactFiberFromElement: (el: Element | null) => FiberLike | null;
  serializePropsForFiber: (fiber: FiberLike | null | undefined, serialize: (value: unknown, depth?: number) => unknown) => unknown;
  getHooksInfo: (fiber: FiberLike | null | undefined) => { value: unknown; count: number };
  getHooksCount: (fiber: FiberLike | null | undefined) => number;
  getHooksRootValue: (fiber: FiberLike | null | undefined, options: AnyRecord) => any;
  resolveSpecialCollectionPathSegment: (currentValue: unknown, segment: string) => AnyRecord;
  makeSerializer: (options: AnyRecord) => (value: unknown, depth?: number) => unknown;
  registerFunctionForInspect: (value: Function) => string;
}

/** react inspect/inspectPath 오케스트레이션 핸들러를 구성한다. */
export function createPageAgentInspectHandlers(options: CreatePageAgentInspectHandlersOptions) {
  const {
    maxTraversal,
    maxComponents,
    buildCssSelector,
    getElementPath,
    resolveTargetElement,
    findNearestFiber,
    findAnyFiberInDocument,
    findRootFiber,
    findPreferredSelectedFiber,
    isInspectableTag,
    getFiberIdMap,
    getStableFiberId,
    getFiberName,
    getFiberKind,
    getReactFiberFromElement,
    serializePropsForFiber,
    getHooksInfo,
    getHooksCount,
    getHooksRootValue,
    resolveSpecialCollectionPathSegment,
    makeSerializer,
    registerFunctionForInspect,
  } = options;

  const {
    rootHasComponentId,
    findRootFiberByComponentId,
    findFiberByComponentId,
    findFiberByComponentIdAcrossDocument,
  } = createPageAgentFiberSearchHelpers({
    maxTraversal,
    isInspectableTag,
    getStableFiberId,
    getReactFiberFromElement,
    findRootFiber,
  });

  const inspectReactPath = createInspectReactPathFlow({
    resolveTargetElement,
    findNearestFiber,
    findAnyFiberInDocument,
    findRootFiber,
    getFiberIdMap,
    findFiberByComponentId,
    findFiberByComponentIdAcrossDocument,
    getHooksRootValue,
    resolveSpecialCollectionPathSegment,
    makeSerializer,
    registerFunctionForInspect,
  });

  const inspectReactComponents = createInspectReactComponentsFlow({
    maxTraversal,
    maxComponents,
    buildCssSelector,
    getElementPath,
    resolveTargetElement,
    findNearestFiber,
    findAnyFiberInDocument,
    findRootFiber,
    findPreferredSelectedFiber,
    getFiberIdMap,
    rootHasComponentId,
    findRootFiberByComponentId,
    isInspectableTag,
    getStableFiberId,
    getHooksInfo,
    getHooksCount,
    serializePropsForFiber,
    makeSerializer,
    getFiberName,
    getFiberKind,
  });

  return {
    inspectReactComponents,
    inspectReactPath,
  };
}
