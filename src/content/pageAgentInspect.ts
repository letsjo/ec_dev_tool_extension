// @ts-nocheck
import { createPageAgentFiberSearchHelpers } from "./pageAgentFiberSearch";
import { createInspectReactComponentsFlow } from "./pageAgentInspectComponentsFlow";
import { createInspectReactPathFlow } from "./pageAgentInspectPathFlow";
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
