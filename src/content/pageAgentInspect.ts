// @ts-nocheck
import { createPageAgentFiberSearchHelpers } from "./pageAgentFiberSearch";
import { resolveSelectedComponentIndex } from "./pageAgentInspectSelection";
import { resolveInspectPathValue } from "./pageAgentInspectPathValue";
import { getDomInfoForFiber } from "./pageAgentInspectDomInfo";
import {
  resolveInspectPathTargetFiber,
  resolveInspectRootContext,
} from "./pageAgentInspectTarget";
import { walkInspectableComponents } from "./pageAgentInspectComponentWalk";
import { resolveInspectPathModeResponse } from "./pageAgentInspectPathMode";

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

  /** 경로 기준 inspect 동작을 수행 */
  function inspectReactComponents(args: AnyRecord | null | undefined) {
    const selector = typeof args?.selector === "string" ? args.selector : "";
    const pickPoint = args?.pickPoint;
    const includeSerializedData = args?.includeSerializedData !== false;
    const selectedComponentId = typeof args?.selectedComponentId === "string" && args.selectedComponentId
      ? args.selectedComponentId
      : null;

    try {
      const resolvedRoot = resolveInspectRootContext({
        selector,
        pickPoint,
        resolveTargetElement,
        findNearestFiber,
        findAnyFiberInDocument,
        findRootFiber,
      });
      if (!resolvedRoot.ok) {
        if (resolvedRoot.reason === "missingNearest") {
          return { error: "React fiber를 찾을 수 없습니다. (React 16+ 필요)", selector, pickPoint };
        }
        return { error: "React root fiber를 찾을 수 없습니다.", selector };
      }
      const { targetEl, nearest } = resolvedRoot;
      let { rootFiber } = resolvedRoot;

      const hostCache = new Map();
      const visiting = new Set();
      const fiberIdMap = getFiberIdMap();

      if (selectedComponentId && !includeSerializedData && !selector && !rootHasComponentId(rootFiber, selectedComponentId, fiberIdMap)) {
        const matchedRoot = findRootFiberByComponentId(selectedComponentId, fiberIdMap);
        if (matchedRoot) {
          rootFiber = matchedRoot;
        }
      }

      const walked = walkInspectableComponents({
        rootFiber,
        targetEl,
        includeSerializedData,
        selectedComponentId,
        maxTraversal,
        maxComponents,
        isInspectableTag,
        getDomInfoForFiber(fiber) {
          return getDomInfoForFiber({
            fiber,
            hostCache,
            visiting,
            selectedEl: targetEl,
            buildCssSelector,
            getElementPath,
          });
        },
        getStableFiberId,
        fiberIdMap,
        getHooksInfo,
        getHooksCount,
        serializePropsForFiber,
        makeSerializer,
        getFiberName,
        getFiberKind,
      });
      const { components, idByFiber, targetMatchedIndex } = walked;

      if (components.length === 0) {
        return { error: "분석 가능한 React 컴포넌트를 찾지 못했습니다.", selector };
      }

      const preferredFiber = findPreferredSelectedFiber(nearest.fiber);
      const selectedIndex = resolveSelectedComponentIndex({
        components,
        idByFiber,
        preferredFiber,
        targetMatchedIndex,
        resolvePreferredFiberDomInfo() {
          return preferredFiber
            ? getDomInfoForFiber({
              fiber: preferredFiber,
              hostCache,
              visiting,
              selectedEl: targetEl,
              buildCssSelector,
              getElementPath,
            })
            : null;
        },
      });

      return {
        selector,
        selectedIndex,
        sourceElement: nearest.sourceElement ? {
          selector: buildCssSelector(nearest.sourceElement),
          domPath: getElementPath(nearest.sourceElement),
          tagName: String(nearest.sourceElement.tagName || "").toLowerCase(),
        } : null,
        rootSummary: {
          totalComponents: components.length,
        },
        components,
      };
    } catch (e) {
      return { error: String(e && e.message) };
    }
  }

  /** 경로 기준 inspect 동작을 수행 */
  function inspectReactPath(args: AnyRecord | null | undefined) {
    const componentId = typeof args?.componentId === "string" ? args.componentId : "";
    const selector = typeof args?.selector === "string" ? args.selector : "";
    const pickPoint = args?.pickPoint;
    const section = args?.section === "hooks" ? "hooks" : "props";
    const path = Array.isArray(args?.path) ? args.path : [];
    const mode = args?.mode === "inspectFunction" ? "inspectFunction" : "serializeValue";
    const serializeLimit = Number.isFinite(args?.serializeLimit) ? Math.max(1000, Math.floor(args.serializeLimit)) : 45000;

    try {
      if (!componentId) {
        return { ok: false, error: "componentId가 필요합니다." };
      }

      const resolvedRoot = resolveInspectRootContext({
        selector,
        pickPoint,
        resolveTargetElement,
        findNearestFiber,
        findAnyFiberInDocument,
        findRootFiber,
      });
      if (!resolvedRoot.ok) {
        if (resolvedRoot.reason === "missingNearest") {
          return { ok: false, error: "React fiber를 찾지 못했습니다." };
        }
        return { ok: false, error: "React root fiber를 찾지 못했습니다." };
      }
      const fiberIdMap = getFiberIdMap();
      const { rootFiber } = resolvedRoot;
      const targetFiber = resolveInspectPathTargetFiber({
        rootFiber,
        componentId,
        fiberIdMap,
        findFiberByComponentId,
        findFiberByComponentIdAcrossDocument,
      });
      if (!targetFiber) {
        return { ok: false, error: "대상 컴포넌트를 찾지 못했습니다." };
      }

      const rootValue = section === "props"
        ? targetFiber.memoizedProps
        : getHooksRootValue(targetFiber, { includeCustomGroups: true });
      const pathResolved = resolveInspectPathValue({
        initialValue: rootValue,
        path,
        resolveSpecialCollectionPathSegment,
      });
      if (!pathResolved.ok) {
        return pathResolved;
      }
      const value = pathResolved.value;
      return resolveInspectPathModeResponse({
        mode,
        value,
        serializeLimit,
        makeSerializer,
        registerFunctionForInspect,
      });
    } catch (e) {
      return { ok: false, error: String(e && e.message) };
    }
  }

  return {
    inspectReactComponents,
    inspectReactPath,
  };
}
