import {
  buildCssSelector,
  getElementPath,
  resolveTargetElement as resolveTargetElementValue,
} from '../dom/pageAgentDom';
import type { PickPoint } from '../../shared/inspector';
import {
  findAnyFiberInDocument,
  findNearestFiber,
  getReactFiberFromElement,
} from '../fiber/pageAgentFiberElement';
import {
  findPreferredSelectedFiber,
  findRootFiber,
  getFiberKind,
  getFiberName,
  isInspectableTag,
} from '../fiber/pageAgentFiberDescribe';
import {
  getFiberIdMap as getFiberIdMapValue,
  getStableFiberId as getStableFiberIdValue,
  registerFunctionForInspect as registerFunctionForInspectValue,
} from '../fiber/pageAgentFiberRegistry';
import { createPageAgentHooksInfoHelpers } from '../hooks/pageAgentHooksInfo';
import { createPageAgentInspectHandlers } from '../pageAgentInspect';
import {
  makeSerializer,
  resolveSpecialCollectionPathSegment,
  serializePropsForFiber,
} from '../serialization/pageAgentSerialization';
import type { FiberLike } from '../fiber/pageAgentFiberSearchTypes';
import type { CreatePageAgentRuntimeMethodExecutorOptions } from './pageAgentRuntimeTypes';

type InspectHandlers = ReturnType<typeof createPageAgentInspectHandlers>;

/** pageAgent inspect 결선 의존성(fiber/hook/serializer)을 조립한다. */
export function createPageAgentRuntimeInspectHandlers(
  options: CreatePageAgentRuntimeMethodExecutorOptions,
): InspectHandlers {
  const getFiberIdMap = () => getFiberIdMapValue(options.runtimeWindow, options.fiberIdMapKey);

  const getStableFiberId = (
    fiber: FiberLike | null | undefined,
    map: WeakMap<object, string>,
  ) => getStableFiberIdValue(options.runtimeWindow, options.fiberIdSeqKey, fiber, map);

  const registerFunctionForInspect = (value: Function) =>
    registerFunctionForInspectValue(options.runtimeWindow, value, {
      registryKey: options.functionInspectRegistryKey,
      orderKey: options.functionInspectRegistryOrderKey,
      seqKey: options.functionInspectSeqKey,
      maxFunctionInspectRefs: options.maxFunctionInspectRefs,
    });

  const { getHooksRootValue, getHooksCount, getHooksInfo } = createPageAgentHooksInfoHelpers({
    getFiberName(fiber) {
      return fiber ? getFiberName(fiber as FiberLike) : 'Unknown';
    },
  });

  return createPageAgentInspectHandlers({
    maxTraversal: options.maxTraversal,
    maxComponents: options.maxComponents,
    buildCssSelector,
    getElementPath,
    resolveTargetElement(selector, pickPoint) {
      return resolveTargetElementValue(selector, pickPoint as PickPoint | null | undefined);
    },
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
  });
}
