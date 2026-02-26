import { createInspectReactComponentsFlow } from './inspect/components/pageAgentInspectComponentsFlow';
import { createInspectReactPathFlow } from './inspect/path/pageAgentInspectPathFlow';
import type { createPageAgentFiberSearchHelpers } from './pageAgentFiberSearch';
import type { CreatePageAgentInspectHandlersOptions } from './pageAgentInspectTypes';

interface CreatePageAgentInspectFlowWiringOptions {
  inspectOptions: CreatePageAgentInspectHandlersOptions;
  fiberSearchHelpers: ReturnType<typeof createPageAgentFiberSearchHelpers>;
}

/** inspect path/components flow를 한 곳에서 결선해 inspect 오케스트레이터를 단순화한다. */
function createPageAgentInspectFlowWiring(options: CreatePageAgentInspectFlowWiringOptions) {
  const { inspectOptions, fiberSearchHelpers } = options;
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
    serializePropsForFiber,
    getHooksInfo,
    getHooksCount,
    getHooksRootValue,
    resolveSpecialCollectionPathSegment,
    makeSerializer,
    registerFunctionForInspect,
  } = inspectOptions;
  const {
    rootHasComponentId,
    findRootFiberByComponentId,
    findFiberByComponentId,
    findFiberByComponentIdAcrossDocument,
  } = fiberSearchHelpers;

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

export { createPageAgentInspectFlowWiring };
export type { CreatePageAgentInspectFlowWiringOptions };
