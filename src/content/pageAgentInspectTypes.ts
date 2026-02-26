import type { FiberLike } from './pageAgentFiberSearchTypes';

type Serializer = (value: unknown, depth?: number) => unknown;

interface NearestFiberMatch {
  fiber: FiberLike;
  sourceElement: Element | null;
}

interface CreatePageAgentInspectHandlersOptions {
  maxTraversal: number;
  maxComponents: number;
  buildCssSelector: (el: Element | null) => string;
  getElementPath: (el: Element | null) => string;
  resolveTargetElement: (selector: string, pickPoint: unknown) => Element | null;
  findNearestFiber: (startEl: Element | null) => NearestFiberMatch | null;
  findAnyFiberInDocument: () => NearestFiberMatch | null;
  findRootFiber: (fiber: FiberLike) => FiberLike | null;
  findPreferredSelectedFiber: (startFiber: FiberLike) => FiberLike | null;
  isInspectableTag: (tag: number) => boolean;
  getFiberIdMap: () => WeakMap<object, string>;
  getStableFiberId: (fiber: FiberLike | null | undefined, map: WeakMap<object, string>) => string | null;
  getFiberName: (fiber: FiberLike) => string;
  getFiberKind: (tag: number) => string;
  getReactFiberFromElement: (el: Element | null) => FiberLike | null;
  serializePropsForFiber: (fiber: FiberLike | null | undefined, serialize: Serializer) => unknown;
  getHooksInfo: (fiber: FiberLike | null | undefined) => { value: unknown; count: number };
  getHooksCount: (fiber: FiberLike | null | undefined) => number;
  getHooksRootValue: (
    fiber: FiberLike | null | undefined,
    options: Record<string, unknown>,
  ) => unknown;
  resolveSpecialCollectionPathSegment: (
    currentValue: unknown,
    segment: string,
  ) => Record<string, unknown>;
  makeSerializer: (options: Record<string, unknown>) => Serializer;
  registerFunctionForInspect: (value: Function) => string;
}

export type { Serializer, NearestFiberMatch, CreatePageAgentInspectHandlersOptions };
