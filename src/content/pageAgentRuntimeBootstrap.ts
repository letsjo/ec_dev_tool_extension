import {
  buildCssSelector,
  createPageDomHandlers,
  getElementPath,
  resolveTargetElement as resolveTargetElementValue,
} from './dom/pageAgentDom';
import type { PickPoint } from '../shared/inspector/types';
import {
  findAnyFiberInDocument,
  findNearestFiber,
  getReactFiberFromElement,
} from './pageAgentFiberElement';
import {
  findPreferredSelectedFiber,
  findRootFiber,
  getFiberKind,
  getFiberName,
  isInspectableTag,
} from './pageAgentFiberDescribe';
import {
  getFiberIdMap as getFiberIdMapValue,
  getStableFiberId as getStableFiberIdValue,
  registerFunctionForInspect as registerFunctionForInspectValue,
} from './pageAgentFiberRegistry';
import { createPageAgentHooksInfoHelpers } from './pageAgentHooksInfo';
import { createPageAgentInspectHandlers } from './pageAgentInspect';
import { createPageAgentMethodExecutor } from './pageAgentMethods';
import {
  makeSerializer,
  resolveSpecialCollectionPathSegment,
  serializePropsForFiber,
} from './serialization/pageAgentSerialization';
import type { FiberLike } from './pageAgentFiberSearchTypes';

type MethodExecutor = (method: string, args: unknown) => unknown;

interface CreatePageAgentRuntimeMethodExecutorOptions {
  runtimeWindow: Window;
  componentHighlightStorageKey: string;
  hoverPreviewStorageKey: string;
  fiberIdMapKey: string;
  fiberIdSeqKey: string;
  functionInspectRegistryKey: string;
  functionInspectRegistryOrderKey: string;
  functionInspectSeqKey: string;
  maxTraversal: number;
  maxComponents: number;
  maxFunctionInspectRefs: number;
}

/**
 * pageAgent runtime 초기화 단계(도메인 핸들러 + inspect + method executor)를 조립한다.
 * runtime entry는 bridge 설치 단계만 남기기 위해 executeMethod 생성을 분리한다.
 */
function createPageAgentRuntimeMethodExecutor(
  options: CreatePageAgentRuntimeMethodExecutorOptions,
): MethodExecutor {
  const domHandlers = createPageDomHandlers({
    componentHighlightStorageKey: options.componentHighlightStorageKey,
    hoverPreviewStorageKey: options.hoverPreviewStorageKey,
  });

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

  const { inspectReactComponents, inspectReactPath } = createPageAgentInspectHandlers({
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

  return createPageAgentMethodExecutor({
    domHandlers: {
      getDomTree(args) {
        return domHandlers.getDomTree(args as Record<string, unknown> | null | undefined);
      },
      highlightComponent(args) {
        return domHandlers.highlightComponent(args as Record<string, unknown> | null | undefined);
      },
      clearComponentHighlight() {
        return domHandlers.clearComponentHighlight();
      },
      previewComponent(args) {
        return domHandlers.previewComponent(args as Record<string, unknown> | null | undefined);
      },
      clearHoverPreview() {
        return domHandlers.clearHoverPreview();
      },
    },
    inspectReactComponents(args) {
      return inspectReactComponents(args);
    },
    inspectReactPath(args) {
      return inspectReactPath(args as Record<string, unknown> | null | undefined);
    },
  });
}

export { createPageAgentRuntimeMethodExecutor };
export type { CreatePageAgentRuntimeMethodExecutorOptions };
