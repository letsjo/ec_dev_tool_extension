// @ts-nocheck
import {
  buildCssSelector,
  createPageDomHandlers,
  getElementPath,
  resolveTargetElement,
} from './pageAgentDom';
import { installPageAgentBridge } from './pageAgentBridge';
import { createPageAgentMethodExecutor } from './pageAgentMethods';
import { createPageAgentHooksInfoHelpers } from './pageAgentHooksInfo';
import { createPageAgentInspectHandlers } from './pageAgentInspect';
import {
  makeSerializer,
  resolveSpecialCollectionPathSegment,
  serializePropsForFiber,
} from './pageAgentSerialization';
import {
  getFiberIdMap as getFiberIdMapValue,
  getStableFiberId as getStableFiberIdValue,
  registerFunctionForInspect as registerFunctionForInspectValue,
} from './pageAgentFiberRegistry';
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

const COMPONENT_HIGHLIGHT_STORAGE_KEY = '__EC_DEV_TOOL_COMPONENT_HIGHLIGHT__';
const HOVER_PREVIEW_STORAGE_KEY = '__EC_DEV_TOOL_COMPONENT_HOVER_PREVIEW__';

const FIBER_ID_MAP_KEY = '__EC_DEV_TOOL_FIBER_ID_MAP__';
const FIBER_ID_SEQ_KEY = '__EC_DEV_TOOL_FIBER_ID_SEQ__';
const FUNCTION_INSPECT_REGISTRY_KEY = '__EC_DEV_TOOL_FUNCTION_INSPECT_REGISTRY__';
const FUNCTION_INSPECT_REGISTRY_ORDER_KEY = '__EC_DEV_TOOL_FUNCTION_INSPECT_REGISTRY_ORDER__';
const FUNCTION_INSPECT_SEQ_KEY = '__EC_DEV_TOOL_FUNCTION_INSPECT_SEQ__';

const MAX_TRAVERSAL = 12000;
const MAX_COMPONENTS = 3500;
const MAX_FUNCTION_INSPECT_REFS = 240;

type AnyRecord = Record<string, any>;

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

interface InstallPageAgentRuntimeOptions {
  bridgeSource: string;
  requestAction: string;
  responseAction: string;
}

const DEFAULT_OPTIONS: InstallPageAgentRuntimeOptions = {
  bridgeSource: 'EC_DEV_TOOL_PAGE_AGENT_BRIDGE',
  requestAction: 'request',
  responseAction: 'response',
};

/** pageAgent 도메인 핸들러를 조립하고 bridge request handler를 설치한다. */
function installPageAgentRuntime(
  runtimeWindow: Window,
  options: InstallPageAgentRuntimeOptions = DEFAULT_OPTIONS,
) {
  const domHandlers = createPageDomHandlers({
    componentHighlightStorageKey: COMPONENT_HIGHLIGHT_STORAGE_KEY,
    hoverPreviewStorageKey: HOVER_PREVIEW_STORAGE_KEY,
  });

  const getFiberIdMap = () => getFiberIdMapValue(runtimeWindow, FIBER_ID_MAP_KEY);

  const getStableFiberId = (
    fiber: FiberLike | null | undefined,
    map: WeakMap<object, string>,
  ) => getStableFiberIdValue(runtimeWindow, FIBER_ID_SEQ_KEY, fiber, map);

  const registerFunctionForInspect = (value: Function) =>
    registerFunctionForInspectValue(runtimeWindow, value, {
      registryKey: FUNCTION_INSPECT_REGISTRY_KEY,
      orderKey: FUNCTION_INSPECT_REGISTRY_ORDER_KEY,
      seqKey: FUNCTION_INSPECT_SEQ_KEY,
      maxFunctionInspectRefs: MAX_FUNCTION_INSPECT_REFS,
    });

  const { getHooksRootValue, getHooksCount, getHooksInfo } =
    createPageAgentHooksInfoHelpers({
      getFiberName,
    });

  const { inspectReactComponents, inspectReactPath } = createPageAgentInspectHandlers({
    maxTraversal: MAX_TRAVERSAL,
    maxComponents: MAX_COMPONENTS,
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
  });

  const executeMethod = createPageAgentMethodExecutor({
    domHandlers,
    inspectReactComponents,
    inspectReactPath,
  });

  installPageAgentBridge({
    bridgeSource: options.bridgeSource,
    requestAction: options.requestAction,
    responseAction: options.responseAction,
    executeMethod,
  });
}

export { installPageAgentRuntime };
