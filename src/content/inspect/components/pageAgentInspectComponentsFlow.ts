import { parseInspectReactComponentsArgs } from "./pageAgentInspectComponentsArgs";
import { createInspectComponentsDomFallbackFactory } from "./pageAgentInspectComponentsDomFallback";
import { resolveInspectComponentsSelectionResult } from "./pageAgentInspectComponentsResult";
import { resolveInspectComponentsRootContext } from "./pageAgentInspectComponentsRoot";
import { buildSourceElementSummary } from "./pageAgentInspectComponentsSource";
import { runInspectComponentsWalk } from "./pageAgentInspectComponentsWalkContext";
import type { SourceElementSummary } from "./pageAgentInspectComponentsSource";
import type { ReactComponentInfo } from "../../../shared/inspector";

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
  const domFallbackFactory = createInspectComponentsDomFallbackFactory({
    buildCssSelector,
    getElementPath,
  });

  return function inspectReactComponents(args: unknown): InspectReactComponentsResult {
    const { selector, pickPoint, includeSerializedData, selectedComponentId } =
      parseInspectReactComponentsArgs(args);

    try {
      const fallbackTargetElement = resolveTargetElement(selector, pickPoint);
      const resolvedRoot = resolveInspectComponentsRootContext({
        selector,
        pickPoint,
        selectedComponentId,
        includeSerializedData,
        resolveTargetElement,
        findNearestFiber,
        findAnyFiberInDocument,
        findRootFiber,
        getFiberIdMap,
        rootHasComponentId,
        findRootFiberByComponentId,
      });
      if (!resolvedRoot.ok) {
        if (fallbackTargetElement) {
          const fallbackComponents = domFallbackFactory.buildTargetChain(
            fallbackTargetElement,
          );
          if (fallbackComponents.length > 0) {
            return {
              selector,
              selectedIndex: fallbackComponents.length - 1,
              sourceElement: buildSourceElementSummary({
                sourceElement: fallbackTargetElement,
                buildCssSelector,
                getElementPath,
              }),
              rootSummary: {
                totalComponents: fallbackComponents.length,
              },
              components: fallbackComponents,
            };
          }
        }
        return {
          error: resolvedRoot.error,
          selector: resolvedRoot.selector,
          pickPoint: resolvedRoot.pickPoint,
        };
      }
      const { targetEl, nearest, rootFiber, hostCache, visiting, fiberIdMap } = resolvedRoot;

      const walked = runInspectComponentsWalk({
        rootFiber,
        targetEl,
        includeSerializedData,
        selectedComponentId,
        maxTraversal,
        maxComponents,
        isInspectableTag,
        hostCache,
        visiting,
        buildCssSelector,
        getElementPath,
        getStableFiberId,
        fiberIdMap,
        getHooksInfo,
        getHooksCount,
        serializePropsForFiber,
        makeSerializer,
        getFiberName,
        getFiberKind,
      });
      const components = walked.components;
      const { idByFiber, targetMatchedIndex } = walked;

      if (components.length === 0) {
        if (targetEl) {
          const fallbackComponents = domFallbackFactory.buildTargetChain(targetEl);
          if (fallbackComponents.length > 0) {
            return {
              selector,
              selectedIndex: fallbackComponents.length - 1,
              sourceElement: buildSourceElementSummary({
                sourceElement: targetEl,
                buildCssSelector,
                getElementPath,
              }),
              rootSummary: {
                totalComponents: fallbackComponents.length,
              },
              components: fallbackComponents,
            };
          }
        }
        return { error: "분석 가능한 React 컴포넌트를 찾지 못했습니다.", selector };
      }

      const selectionResult = resolveInspectComponentsSelectionResult({
        components,
        idByFiber,
        targetMatchedIndex,
        nearest,
        targetEl,
        hostCache,
        visiting,
        findPreferredSelectedFiber,
        buildCssSelector,
        getElementPath,
      });
      let selectedIndex = selectionResult.selectedIndex;
      let sourceElement = selectionResult.sourceElement;

      const targetDomPath = targetEl ? getElementPath(targetEl) : '';
      const hasExactTargetMatch =
        Boolean(targetDomPath) &&
        components.some((component) => component.domPath === targetDomPath);

      if (targetEl && !hasExactTargetMatch) {
        // 선택 target이 React 컴포넌트 DOM과 1:1 매칭되지 않으면
        // leaf DOM fallback을 추가해 Components Tree/Inspector가 실제 클릭 요소를 반영한다.
        const fallbackLeaf = domFallbackFactory.buildTargetLeaf(targetEl, 0, null);
        const existingFallbackIndex = components.findIndex(
          (component) => component.id === fallbackLeaf.id,
        );
        if (existingFallbackIndex >= 0) {
          selectedIndex = existingFallbackIndex;
        } else {
          components.push(fallbackLeaf);
          selectedIndex = components.length - 1;
        }
        sourceElement = buildSourceElementSummary({
          sourceElement: targetEl,
          buildCssSelector,
          getElementPath,
        });
      }

      return {
        selector,
        selectedIndex,
        sourceElement,
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
