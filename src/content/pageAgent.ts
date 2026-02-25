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
import { inspectCustomHookGroupNames } from "./pageAgentHookGroups";
import {
  inferHookName,
  normalizeHookStateForDisplay,
} from "./pageAgentHookState";
import { applyCustomHookMetadata } from "./pageAgentHookMetadata";
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

/** 필요한 값/상태를 계산해 반환 */
function getHooksRootValue(fiber: FiberLike | null | undefined, options: AnyRecord | null | undefined) {
  const includeCustomGroups = options && options.includeCustomGroups === true;
  if (!fiber) return [];
  if (fiber.tag === 1) {
    if (fiber.memoizedState == null) return [];
    return [{ index: 0, name: "ClassState", state: fiber.memoizedState, group: null, groupPath: null }];
  }

  const hooks = [];
  let node = fiber.memoizedState;
  let guard = 0;
  const hookTypes = Array.isArray(fiber._debugHookTypes) ? fiber._debugHookTypes : null;

  while (node && guard < 120) {
    const hookName = inferHookName(node, guard, hookTypes);
    let nodeValue = node;
    if (typeof node === "object" && node !== null && "memoizedState" in node) {
      nodeValue = node.memoizedState;
    }
    hooks.push({
      index: guard,
      name: hookName,
      state: normalizeHookStateForDisplay(hookName, nodeValue),
      group: null,
      groupPath: null,
    });

    if (typeof node === "object" && node !== null && "next" in node) {
      node = node.next;
      guard += 1;
      continue;
    }
    break;
  }

  if (includeCustomGroups) {
    const customMetadata = inspectCustomHookGroupNames(fiber, null, getFiberName);
    applyCustomHookMetadata(hooks, customMetadata);
  }

  for (let i = 0; i < hooks.length; i += 1) {
    hooks[i].state = normalizeHookStateForDisplay(hooks[i].name, hooks[i].state);
  }

  return hooks;
}

/** 필요한 값/상태를 계산해 반환 */
function getHooksCount(fiber: FiberLike | null | undefined) {
  return getHooksRootValue(fiber, { includeCustomGroups: false }).length;
}

/** 필요한 값/상태를 계산해 반환 */
function getHooksInfo(fiber: FiberLike | null | undefined) {
  const hooks = getHooksRootValue(fiber, { includeCustomGroups: true });
  const out = [];
  const maxLen = Math.min(hooks.length, 120);
  const perHookBudget = 12000;
  for (let i = 0; i < maxLen; i += 1) {
    const hook = hooks[i];
    const hookSerialize = makeSerializer({
      maxSerializeCalls: perHookBudget,
      maxDepth: 2,
      maxArrayLength: 80,
      maxObjectKeys: 80,
      maxMapEntries: 60,
      maxSetEntries: 60,
    });
    out.push({
      index: hook.index,
      name: hook.name,
      group: typeof hook.group === "string" ? hook.group : null,
      groupPath: Array.isArray(hook.groupPath) ? hook.groupPath : null,
      state: hookSerialize(hook.state),
    });
  }
  if (hooks.length > maxLen) {
    out.push({
      index: maxLen,
      name: "Truncated",
      group: null,
      groupPath: null,
      state: "[+" + String(hooks.length - maxLen) + " more hooks]",
    });
  }
  return { value: out, count: hooks.length };
}

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
