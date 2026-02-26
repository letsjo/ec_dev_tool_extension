// @ts-nocheck
import { parseInspectReactComponentsArgs } from "./pageAgentInspectComponentsArgs";
import { buildSourceElementSummary } from "./pageAgentInspectComponentsSource";
import { walkInspectableComponents } from "./pageAgentInspectComponentWalk";
import { getDomInfoForFiber } from "./pageAgentInspectDomInfo";
import { resolveSelectedComponentIndex } from "./pageAgentInspectSelection";
import { resolveInspectRootContext } from "./pageAgentInspectTarget";

type AnyRecord = Record<string, any>;

interface CreateInspectReactComponentsFlowOptions {
  maxTraversal: number;
  maxComponents: number;
  buildCssSelector: (el: Element | null) => string;
  getElementPath: (el: Element | null) => string;
  resolveTargetElement: (selector: string, pickPoint: unknown) => Element | null;
  findNearestFiber: (startEl: Element | null) => { fiber: AnyRecord; sourceElement: Element | null } | null;
  findAnyFiberInDocument: () => { fiber: AnyRecord; sourceElement: Element | null } | null;
  findRootFiber: (fiber: AnyRecord) => AnyRecord | null;
  findPreferredSelectedFiber: (startFiber: AnyRecord) => AnyRecord | null;
  getFiberIdMap: () => WeakMap<object, string>;
  rootHasComponentId: (
    rootFiber: AnyRecord | null | undefined,
    componentId: string | null | undefined,
    fiberIdMap: WeakMap<object, string>,
  ) => boolean;
  findRootFiberByComponentId: (
    componentId: string | null | undefined,
    fiberIdMap: WeakMap<object, string>,
  ) => AnyRecord | null;
  isInspectableTag: (tag: number) => boolean;
  getStableFiberId: (fiber: AnyRecord | null | undefined, map: WeakMap<object, string>) => string | null;
  getHooksInfo: (fiber: AnyRecord | null | undefined) => { value: unknown; count: number };
  getHooksCount: (fiber: AnyRecord | null | undefined) => number;
  serializePropsForFiber: (
    fiber: AnyRecord | null | undefined,
    serialize: (value: unknown, depth?: number) => unknown,
  ) => unknown;
  makeSerializer: (options: AnyRecord) => (value: unknown, depth?: number) => unknown;
  getFiberName: (fiber: AnyRecord) => string;
  getFiberKind: (tag: number) => string;
}

/** reactInspect component 목록 흐름(root resolve -> walk -> selection 계산)을 구성한다. */
function createInspectReactComponentsFlow(options: CreateInspectReactComponentsFlowOptions) {
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
  } = options;

  return function inspectReactComponents(args: AnyRecord | null | undefined) {
    const { selector, pickPoint, includeSerializedData, selectedComponentId } =
      parseInspectReactComponentsArgs(args);

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

      if (
        selectedComponentId &&
        !includeSerializedData &&
        !selector &&
        !rootHasComponentId(rootFiber, selectedComponentId, fiberIdMap)
      ) {
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
        sourceElement: buildSourceElementSummary({
          sourceElement: nearest.sourceElement,
          buildCssSelector,
          getElementPath,
        }),
        rootSummary: {
          totalComponents: components.length,
        },
        components,
      };
    } catch (e) {
      return { error: String(e && e.message) };
    }
  };
}

export { createInspectReactComponentsFlow };
