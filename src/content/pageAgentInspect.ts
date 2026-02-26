// @ts-nocheck
import { createPageAgentFiberSearchHelpers } from "./pageAgentFiberSearch";
import { createPageAgentInspectFlowWiring } from "./pageAgentInspectFlowWiring";
import type { CreatePageAgentInspectHandlersOptions } from "./pageAgentInspectTypes";

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

  const fiberSearchHelpers = createPageAgentFiberSearchHelpers({
    maxTraversal,
    isInspectableTag,
    getStableFiberId,
    getReactFiberFromElement,
    findRootFiber,
  });
  return createPageAgentInspectFlowWiring({
    inspectOptions: {
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
    },
    fiberSearchHelpers,
  });
}
