// @ts-nocheck
/**
 * Main world page agent.
 *
 * 흐름 요약:
 * 1. content script로부터 브리지 요청을 수신한다.
 * 2. React fiber/DOM 탐색 및 직렬화를 페이지 컨텍스트에서 수행한다.
 * 3. 결과를 브리지 응답으로 돌려주고, highlight/preview 상태를 관리한다.
 */
import {
  buildCssSelector,
  createPageDomHandlers,
  getElementPath,
  resolveTargetElement,
} from "./pageAgentDom";
import { installPageAgentBridge } from "./pageAgentBridge";
import { createPageAgentMethodExecutor } from "./pageAgentMethods";
import { createPageAgentHooksInfoHelpers } from "./pageAgentHooksInfo";
import { createPageAgentInspectHandlers } from "./pageAgentInspect";
import {
  makeSerializer,
  resolveSpecialCollectionPathSegment,
  serializePropsForFiber,
} from "./pageAgentSerialization";
import {
  getFiberIdMap as getFiberIdMapValue,
  getStableFiberId as getStableFiberIdValue,
  registerFunctionForInspect as registerFunctionForInspectValue,
} from "./pageAgentFiberRegistry";
import {
  findAnyFiberInDocument,
  findNearestFiber,
  getReactFiberFromElement,
} from "./pageAgentFiberElement";
import {
  findPreferredSelectedFiber,
  findRootFiber,
  getFiberKind,
  getFiberName,
  isInspectableTag,
} from "./pageAgentFiberDescribe";

const BRIDGE_SOURCE = "EC_DEV_TOOL_PAGE_AGENT_BRIDGE";
const BRIDGE_ACTION_REQUEST = "request";
const BRIDGE_ACTION_RESPONSE = "response";

if (window.__EC_DEV_TOOL_PAGE_AGENT_INSTALLED__) {
  /** 이미 주입된 경우 재설치를 건너뛴다. */
} else {
window.__EC_DEV_TOOL_PAGE_AGENT_INSTALLED__ = true;

const COMPONENT_HIGHLIGHT_STORAGE_KEY = "__EC_DEV_TOOL_COMPONENT_HIGHLIGHT__";
const HOVER_PREVIEW_STORAGE_KEY = "__EC_DEV_TOOL_COMPONENT_HOVER_PREVIEW__";
const domHandlers = createPageDomHandlers({
  componentHighlightStorageKey: COMPONENT_HIGHLIGHT_STORAGE_KEY,
  hoverPreviewStorageKey: HOVER_PREVIEW_STORAGE_KEY,
});

const FIBER_ID_MAP_KEY = "__EC_DEV_TOOL_FIBER_ID_MAP__";
const FIBER_ID_SEQ_KEY = "__EC_DEV_TOOL_FIBER_ID_SEQ__";
const FUNCTION_INSPECT_REGISTRY_KEY = "__EC_DEV_TOOL_FUNCTION_INSPECT_REGISTRY__";
const FUNCTION_INSPECT_REGISTRY_ORDER_KEY = "__EC_DEV_TOOL_FUNCTION_INSPECT_REGISTRY_ORDER__";
const FUNCTION_INSPECT_SEQ_KEY = "__EC_DEV_TOOL_FUNCTION_INSPECT_SEQ__";

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

/** 필요한 값/상태를 계산해 반환 */
const getFiberIdMap = () => getFiberIdMapValue(window, FIBER_ID_MAP_KEY);

/** 필요한 값/상태를 계산해 반환 */
const getStableFiberId = (fiber: FiberLike | null | undefined, map: WeakMap<object, string>) =>
  getStableFiberIdValue(window, FIBER_ID_SEQ_KEY, fiber, map);

/** 해당 기능 흐름을 처리 */
const registerFunctionForInspect = (value: Function) =>
  registerFunctionForInspectValue(window, value, {
    registryKey: FUNCTION_INSPECT_REGISTRY_KEY,
    orderKey: FUNCTION_INSPECT_REGISTRY_ORDER_KEY,
    seqKey: FUNCTION_INSPECT_SEQ_KEY,
    maxFunctionInspectRefs: MAX_FUNCTION_INSPECT_REFS,
  });

const { getHooksRootValue, getHooksCount, getHooksInfo } = createPageAgentHooksInfoHelpers({
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
  bridgeSource: BRIDGE_SOURCE,
  requestAction: BRIDGE_ACTION_REQUEST,
  responseAction: BRIDGE_ACTION_RESPONSE,
  executeMethod,
});
}
