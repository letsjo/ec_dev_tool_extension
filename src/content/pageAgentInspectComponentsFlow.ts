import { parseInspectReactComponentsArgs } from "./pageAgentInspectComponentsArgs";
import { buildSourceElementSummary } from "./pageAgentInspectComponentsSource";
import { walkInspectableComponents } from "./pageAgentInspectComponentWalk";
import { getDomInfoForFiber } from "./pageAgentInspectDomInfo";
import { resolveSelectedComponentIndex } from "./pageAgentInspectSelection";
import { resolveInspectRootContext } from "./pageAgentInspectTarget";
import type { SourceElementSummary } from "./pageAgentInspectComponentsSource";
import type { ReactComponentInfo } from "../shared/inspector/types";

type InspectFiber = {
  tag?: number;
  alternate?: InspectFiber | null;
  [key: string]: unknown;
};

type Serializer = (value: unknown, depth?: number) => unknown;

interface CreateInspectReactComponentsFlowOptions {
  maxTraversal: number;
  maxComponents: number;
  buildCssSelector: (el: Element | null) => string;
  getElementPath: (el: Element | null) => string;
  resolveTargetElement: (selector: string, pickPoint: unknown) => Element | null;
  findNearestFiber: (startEl: Element | null) => { fiber: InspectFiber; sourceElement: Element | null } | null;
  findAnyFiberInDocument: () => { fiber: InspectFiber; sourceElement: Element | null } | null;
  findRootFiber: (fiber: InspectFiber) => InspectFiber | null;
  findPreferredSelectedFiber: (startFiber: InspectFiber) => InspectFiber | null;
  getFiberIdMap: () => WeakMap<object, string>;
  rootHasComponentId: (
    rootFiber: InspectFiber | null | undefined,
    componentId: string | null | undefined,
    fiberIdMap: WeakMap<object, string>,
  ) => boolean;
  findRootFiberByComponentId: (
    componentId: string | null | undefined,
    fiberIdMap: WeakMap<object, string>,
  ) => InspectFiber | null;
  isInspectableTag: (tag: number) => boolean;
  getStableFiberId: (fiber: InspectFiber | null | undefined, map: WeakMap<object, string>) => string | null;
  getHooksInfo: (fiber: InspectFiber | null | undefined) => { value: unknown; count: number };
  getHooksCount: (fiber: InspectFiber | null | undefined) => number;
  serializePropsForFiber: (
    fiber: InspectFiber | null | undefined,
    serialize: Serializer,
  ) => unknown;
  makeSerializer: (options: Record<string, unknown>) => Serializer;
  getFiberName: (fiber: InspectFiber) => string;
  getFiberKind: (tag: number) => string;
}

interface InspectReactComponentsSuccessResult {
  selector: string;
  selectedIndex: number;
  sourceElement: SourceElementSummary | null;
  rootSummary: {
    totalComponents: number;
  };
  components: ReactComponentInfo[];
}

interface InspectReactComponentsErrorResult {
  error: string;
  selector?: string;
  pickPoint?: unknown;
}

type InspectReactComponentsResult =
  | InspectReactComponentsSuccessResult
  | InspectReactComponentsErrorResult;

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

  return function inspectReactComponents(args: unknown): InspectReactComponentsResult {
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

      const hostCache = new Map<object, Element | null>();
      const visiting = new Set<object>();
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
        rootFiber: rootFiber as Record<string, unknown>,
        targetEl,
        includeSerializedData,
        selectedComponentId,
        maxTraversal,
        maxComponents,
        isInspectableTag,
        getDomInfoForFiber(fiber: Record<string, unknown>) {
          return getDomInfoForFiber({
            fiber: fiber as {
              tag?: number;
              stateNode?: unknown;
              child?: Record<string, unknown> | null;
              sibling?: Record<string, unknown> | null;
            },
            hostCache,
            visiting,
            selectedEl: targetEl,
            buildCssSelector,
            getElementPath,
          });
        },
        getStableFiberId: (fiber, map) => getStableFiberId(fiber as InspectFiber | null, map),
        fiberIdMap,
        getHooksInfo: (fiber) => getHooksInfo(fiber as InspectFiber | null),
        getHooksCount: (fiber) => getHooksCount(fiber as InspectFiber | null),
        serializePropsForFiber: (fiber, serialize) =>
          serializePropsForFiber(fiber as InspectFiber | null, serialize),
        makeSerializer,
        getFiberName: (fiber) => getFiberName(fiber as InspectFiber),
        getFiberKind,
      });
      const components = walked.components as ReactComponentInfo[];
      const { idByFiber, targetMatchedIndex } = walked;

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
    } catch (error: unknown) {
      return {
        error: error instanceof Error ? error.message : String(error),
      };
    }
  };
}

export { createInspectReactComponentsFlow };
