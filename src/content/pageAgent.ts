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
const MAP_ENTRY_PATH_SEGMENT_PREFIX = "__ec_map_entry__";
const MAP_VALUE_PATH_SEGMENT_PREFIX = "__ec_map_value__";
const SET_ENTRY_PATH_SEGMENT_PREFIX = "__ec_set_entry__";
const OBJECT_CLASS_NAME_META_KEY = "__ecObjectClassName";

const MAX_TRAVERSAL = 12000;
const MAX_COMPONENTS = 3500;
const MAX_FUNCTION_INSPECT_REFS = 240;

type AnyRecord = Record<string, any>;
type PathSegment = string | number;
type PickPoint = { x: number; y: number };
type StackFrame = { functionName: string | null; source: string | null };
type SerializerOptions = {
  maxSerializeCalls?: number;
  maxDepth?: number;
  maxArrayLength?: number;
  maxObjectKeys?: number;
  maxMapEntries?: number;
  maxSetEntries?: number;
};

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

const BUILTIN_HOOK_NAMES = {
  State: true,
  Reducer: true,
  Effect: true,
  LayoutEffect: true,
  InsertionEffect: true,
  ImperativeHandle: true,
  Memo: true,
  Callback: true,
  Ref: true,
  DeferredValue: true,
  Transition: true,
  SyncExternalStore: true,
  Id: true,
  DebugValue: true,
  ClassState: true,
  Hook: true,
  Truncated: true,
  Context: true,
  Use: true,
  Promise: true,
  Unresolved: true,
  Optimistic: true,
  FormState: true,
  ActionState: true,
  HostTransitionStatus: true,
  EffectEvent: true,
  MemoCache: true,
};

/** 값이 null이 아니고 object/function 타입인지 판별 */
function isObjectLike(value: unknown) {
  const t = typeof value;
  return (t === "object" || t === "function") && value !== null;
}

/** 필요한 값/상태를 계산해 반환 */
function getFiberIdMap() {
  let map = window[FIBER_ID_MAP_KEY];
  if (!map || typeof map.get !== "function" || typeof map.set !== "function") {
    map = new WeakMap();
    window[FIBER_ID_MAP_KEY] = map;
  }
  return map;
}

/** 필요한 값/상태를 계산해 반환 */
function getFunctionInspectRegistry() {
  let registry = window[FUNCTION_INSPECT_REGISTRY_KEY];
  if (!registry || typeof registry !== "object") {
    registry = {};
    window[FUNCTION_INSPECT_REGISTRY_KEY] = registry;
  }
  return registry;
}

/** 필요한 값/상태를 계산해 반환 */
function getFunctionInspectOrder() {
  let order = window[FUNCTION_INSPECT_REGISTRY_ORDER_KEY];
  if (!Array.isArray(order)) {
    order = [];
    window[FUNCTION_INSPECT_REGISTRY_ORDER_KEY] = order;
  }
  return order;
}

/** 해당 기능 흐름을 처리 */
function registerFunctionForInspect(value: Function) {
  const registry = getFunctionInspectRegistry();
  const order = getFunctionInspectOrder();
  const nextSeqRaw = Number(window[FUNCTION_INSPECT_SEQ_KEY]);
  const nextSeq = Number.isFinite(nextSeqRaw) && nextSeqRaw > 0 ? Math.floor(nextSeqRaw) : 1;
  const key = "fn" + String(nextSeq);
  window[FUNCTION_INSPECT_SEQ_KEY] = nextSeq + 1;

  registry[key] = value;
  order.push(key);

  while (order.length > MAX_FUNCTION_INSPECT_REFS) {
    const staleKey = order.shift();
    if (!staleKey) continue;
    if (staleKey === key) continue;
    delete registry[staleKey];
  }
  return key;
}

/** 필요한 값/상태를 계산해 반환 */
function getNextFiberId() {
  const next = Number(window[FIBER_ID_SEQ_KEY]);
  if (!isFinite(next) || next < 1) return 1;
  return Math.floor(next);
}

/** 필요한 값/상태를 계산해 반환 */
function getStableFiberId(fiber: FiberLike | null | undefined, map: WeakMap<object, string>) {
  if (!isObjectLike(fiber)) return null;

  const existingId = map.get(fiber);
  if (typeof existingId === "string" && existingId) return existingId;

  if (isObjectLike(fiber.alternate)) {
    const alternateId = map.get(fiber.alternate);
    if (typeof alternateId === "string" && alternateId) {
      map.set(fiber, alternateId);
      return alternateId;
    }
  }

  const nextId = getNextFiberId();
  const stableId = "f" + String(nextId);
  window[FIBER_ID_SEQ_KEY] = nextId + 1;
  map.set(fiber, stableId);
  if (isObjectLike(fiber.alternate)) {
    map.set(fiber.alternate, stableId);
  }
  return stableId;
}

/** 필요한 값/상태를 계산해 반환 */
function getReactFiberFromElement(el: Element | null) {
  if (!el) return null;
  const seenKeys = {};

  function readFiberByKey(key: string) {
    if (!key || typeof key !== "string") return null;
    if (key.indexOf("__reactFiber$") === 0 || key.indexOf("__reactInternalInstance$") === 0) {
      try {
        return el[key];
      } catch (_) {
        return null;
      }
    }
    if (key.indexOf("__reactContainer$") === 0) {
      let container = null;
      try {
        container = el[key];
      } catch (_) {
        return null;
      }
      if (container && container.current) return container.current;
      return container;
    }
    return null;
  }

  function scanKeys(keys: string[] | null) {
    if (!keys || typeof keys.length !== "number") return null;
    for (let i = 0; i < keys.length; i += 1) {
      const key = keys[i];
      if (seenKeys[key]) continue;
      seenKeys[key] = true;
      const fiber = readFiberByKey(key);
      if (fiber) return fiber;
    }
    return null;
  }

  let ownKeys = null;
  try {
    ownKeys = Object.getOwnPropertyNames(el);
  } catch (_) {}
  const ownFound = scanKeys(ownKeys);
  if (ownFound) return ownFound;

  let enumKeys = null;
  try {
    enumKeys = Object.keys(el);
  } catch (_) {}
  const enumFound = scanKeys(enumKeys);
  if (enumFound) return enumFound;

  for (const k in el) {
    if (seenKeys[k]) continue;
    seenKeys[k] = true;
    const found = readFiberByKey(k);
    if (found) return found;
  }

  return null;
}

/** 조건에 맞는 대상을 탐색 */
function findNearestFiber(startEl: Element | null) {
  let current = startEl;
  let guard = 0;
  while (current && current.nodeType === 1 && guard < 40) {
    const fiber = getReactFiberFromElement(current);
    if (fiber) return { fiber, sourceElement: current };
    current = current.parentElement;
    guard += 1;
  }
  return null;
}

/** 조건에 맞는 대상을 탐색 */
function findAnyFiberInDocument() {
  const rootEl = document.body || document.documentElement;
  if (!rootEl) return null;

  const queue = [rootEl];
  let cursor = 0;
  let guard = 0;
  const maxScan = 7000;

  while (cursor < queue.length && guard < maxScan) {
    const current = queue[cursor++];
    const fiber = getReactFiberFromElement(current);
    if (fiber) {
      return { fiber, sourceElement: current };
    }

    const children = current.children;
    if (children && children.length) {
      for (let i = 0; i < children.length; i += 1) {
        queue.push(children[i]);
      }
    }
    guard += 1;
  }

  return null;
}

/** 조건에 맞는 대상을 탐색 */
function findRootFiber(fiber: FiberLike) {
  let current = fiber;
  let guard = 0;
  while (current && current.return && guard < 260) {
    current = current.return;
    guard += 1;
  }
  if (current && current.tag === 3 && current.stateNode && current.stateNode.current) {
    return current.stateNode.current;
  }
  return current || fiber;
}

/** 필요한 값/상태를 계산해 반환 */
function getFiberKind(tag: number) {
  const map = {
    0: "FunctionComponent",
    1: "ClassComponent",
    5: "HostComponent",
    11: "ForwardRef",
    14: "MemoComponent",
    15: "SimpleMemoComponent",
  };
  return map[tag] || "Tag#" + String(tag);
}

/** 입력/참조를 실제 대상으로 해석 */
function resolveTypeName(type: unknown) {
  if (!type) return "";
  if (typeof type === "string") return type;
  if (typeof type === "function") return type.displayName || type.name || "Anonymous";
  if (typeof type === "object") {
    if (typeof type.displayName === "string" && type.displayName) return type.displayName;
    if (typeof type.render === "function") return type.render.displayName || type.render.name || "Anonymous";
    if (type.type) return resolveTypeName(type.type);
  }
  return "";
}

/** 필요한 값/상태를 계산해 반환 */
function getFiberName(fiber: FiberLike) {
  return resolveTypeName(fiber.type) || resolveTypeName(fiber.elementType) || getFiberKind(fiber.tag);
}

/** React 컴포넌트 트리에 포함할 수 있는 fiber tag인지 판별 */
function isInspectableTag(tag: number) {
  return tag === 0 || tag === 1 || tag === 5 || tag === 11 || tag === 14 || tag === 15;
}

/** 조건에 맞는 대상을 탐색 */
function findPreferredSelectedFiber(startFiber: FiberLike) {
  let current = startFiber;
  let firstInspectable = null;
  let guard = 0;
  while (current && guard < 320) {
    if (isInspectableTag(current.tag)) {
      if (!firstInspectable) firstInspectable = current;
      if (current.tag !== 5) return current;
    }
    current = current.return;
    guard += 1;
  }
  return firstInspectable;
}

/** 해당 기능 흐름을 처리 */
function parseHookDisplayName(functionName: string | null | undefined) {
  if (!functionName) return "";
  let name = String(functionName);

  const asIndex = name.lastIndexOf("[as ");
  if (asIndex !== -1 && name.charAt(name.length - 1) === "]") {
    return parseHookDisplayName(name.slice(asIndex + "[as ".length, -1));
  }

  const dotIndex = name.lastIndexOf(".");
  if (dotIndex >= 0) {
    name = name.slice(dotIndex + 1);
  }

  if (name.indexOf("unstable_") === 0) {
    name = name.slice("unstable_".length);
  }
  if (name.indexOf("experimental_") === 0) {
    name = name.slice("experimental_".length);
  }

  if (name.indexOf("use") === 0) {
    if (name.length === 3) return "Use";
    name = name.slice(3);
  }

  if (!name) return "";
  return name.charAt(0).toUpperCase() + name.slice(1);
}

/** 함수명이 커스텀 훅 규칙(useXxx)을 따르는지 판별 */
function isCustomHookFunctionName(functionName: string | null | undefined) {
  if (!functionName) return false;
  let name = String(functionName);

  const asIndex = name.lastIndexOf("[as ");
  if (asIndex !== -1 && name.charAt(name.length - 1) === "]") {
    return isCustomHookFunctionName(name.slice(asIndex + "[as ".length, -1));
  }

  const dotIndex = name.lastIndexOf(".");
  if (dotIndex >= 0) {
    name = name.slice(dotIndex + 1);
  }

  if (name.indexOf("unstable_") === 0) {
    name = name.slice("unstable_".length);
  }
  if (name.indexOf("experimental_") === 0) {
    name = name.slice("experimental_".length);
  }

  return name.indexOf("use") === 0 && name.length > 3;
}

/** 스택 소스가 React/확장 내부 프레임인지 판별 */
function isLikelyReactInternalSource(source: string | null | undefined) {
  if (!source) return false;
  const text = String(source).toLowerCase();
  return (
    text.includes("react-dom")
    || text.includes("react.development")
    || text.includes("react.production")
    || text.includes("scheduler")
    || text.includes("react-refresh")
    || text.includes("pageagent.global.js")
    || text.includes("content.global.js")
    || text.includes("reactruntimehook.global.js")
    || text.includes("background.global.js")
    || text.includes("panel.global.js")
    || text.includes("chrome-extension://")
  );
}

/** 프레임이 커스텀 훅 후보로 볼 수 있는지 판별 */
function isLikelyCustomHookFrame(frame: StackFrame | null | undefined) {
  if (!frame) return null;
  const rawFunctionName = frame.functionName;
  const parsedName = parseHookDisplayName(rawFunctionName);
  if (!parsedName) return null;
  if (BUILTIN_HOOK_NAMES[parsedName]) return null;
  if (parsedName === "Object" || parsedName === "Anonymous") return null;
  if (isLikelyReactInternalSource(frame.source)) return null;

  const hasUsePrefix = isCustomHookFunctionName(rawFunctionName);
  const startsWithUpper = /^[A-Z]/.test(parsedName);
  if (!hasUsePrefix && !startsWithUpper) return null;

  return parsedName;
}

/** 해당 기능 흐름을 처리 */
function parseErrorStackFrames(error: Error | null | undefined) {
  if (!error || typeof error.stack !== "string") return [];
  const lines = error.stack.split("\n");
  const frames = [];
  for (let i = 1; i < lines.length; i += 1) {
    let line = String(lines[i] || "").trim();
    if (!line) continue;
    if (line.indexOf("at ") === 0) {
      line = line.slice(3).trim();
    }

    let functionName = "";
    let source = line;
    const withParenMatch = line.match(/^(.*) \((.*)\)$/);
    if (withParenMatch) {
      functionName = withParenMatch[1].trim();
      source = withParenMatch[2].trim();
    } else {
      const atIndex = line.lastIndexOf("@");
      if (atIndex > 0) {
        functionName = line.slice(0, atIndex).trim();
        source = line.slice(atIndex + 1).trim();
      }
    }

    frames.push({
      functionName: functionName || null,
      source: source || null,
    });
  }
  return frames;
}

let mostLikelyAncestorFrameIndex = 0;

/** 조건에 맞는 대상을 탐색 */
function findSharedFrameIndex(hookFrames: StackFrame[], rootFrames: StackFrame[], rootIndex: number) {
  const rootFrame = rootFrames[rootIndex];
  const source = rootFrame && rootFrame.source;
  if (!source) return -1;

  hookSearch:
  for (let i = 0; i < hookFrames.length; i += 1) {
    if (!hookFrames[i] || hookFrames[i].source !== source) continue;

    for (let a = rootIndex + 1, b = i + 1; a < rootFrames.length && b < hookFrames.length; a += 1, b += 1) {
      const rootSource = rootFrames[a] && rootFrames[a].source;
      const hookSource = hookFrames[b] && hookFrames[b].source;
      if (rootSource !== hookSource) {
        continue hookSearch;
      }
    }
    return i;
  }
  return -1;
}

/** 조건에 맞는 대상을 탐색 */
function findCommonAncestorFrameIndex(rootFrames: StackFrame[], hookFrames: StackFrame[]) {
  if (!rootFrames || !hookFrames || rootFrames.length === 0 || hookFrames.length === 0) {
    return -1;
  }

  let rootIndex = findSharedFrameIndex(hookFrames, rootFrames, mostLikelyAncestorFrameIndex);
  if (rootIndex !== -1) {
    return rootIndex;
  }

  const maxRootProbe = Math.min(rootFrames.length, 5);
  for (let i = 0; i < maxRootProbe; i += 1) {
    rootIndex = findSharedFrameIndex(hookFrames, rootFrames, i);
    if (rootIndex !== -1) {
      mostLikelyAncestorFrameIndex = i;
      return rootIndex;
    }
  }
  return -1;
}

/** 데이터를 순회해 수집 */
function collectCustomHookPathFromFrames(frames: StackFrame[], entry: AnyRecord | null | undefined, componentName: string | null | undefined) {
  if (!Array.isArray(frames) || frames.length === 0) return null;
  const names = [];
  for (let i = 0; i < frames.length; i += 1) {
    const parsedName = isLikelyCustomHookFrame(frames[i]);
    if (!parsedName) continue;
    if (componentName && parsedName === componentName) continue;
    if (entry && (parsedName === entry.dispatcherHookName || parsedName === entry.primitive)) continue;
    if (names.length > 0 && names[names.length - 1] === parsedName) continue;
    names.push(parsedName);
  }
  if (names.length === 0) return null;
  names.reverse();
  return names;
}

/** 해당 기능 흐름을 처리 */
function inferGroupPathFromAllFrames(hookFrames: StackFrame[], entry: AnyRecord | null | undefined, componentName: string | null | undefined) {
  return collectCustomHookPathFromFrames(hookFrames, entry, componentName);
}

/** 프레임 이름이 지정한 React 래퍼 훅 이름과 일치하는지 판별 */
function isReactWrapperFrame(functionName: string | null | undefined, wrapperName: string) {
  const hookName = parseHookDisplayName(functionName);
  if (wrapperName === "HostTransitionStatus") {
    return hookName === wrapperName || hookName === "FormStatus";
  }
  return hookName === wrapperName;
}

/** 조건에 맞는 대상을 탐색 */
function findPrimitiveFrameIndex(hookFrames: StackFrame[], entry: AnyRecord | null | undefined, primitiveStackCache: Map<string, StackFrame[]>) {
  if (!hookFrames || hookFrames.length === 0 || !entry || !primitiveStackCache) return -1;
  const primitiveStack = primitiveStackCache.get(entry.primitive);
  if (!primitiveStack) return -1;

  for (let i = 0; i < primitiveStack.length && i < hookFrames.length; i += 1) {
    const primitiveSource = primitiveStack[i] && primitiveStack[i].source;
    const hookSource = hookFrames[i] && hookFrames[i].source;
    if (primitiveSource !== hookSource) {
      if (
        i < hookFrames.length - 1
        && isReactWrapperFrame(hookFrames[i] && hookFrames[i].functionName, entry.dispatcherHookName)
      ) {
        i += 1;
      }
      if (
        i < hookFrames.length - 1
        && isReactWrapperFrame(hookFrames[i] && hookFrames[i].functionName, entry.dispatcherHookName)
      ) {
        i += 1;
      }
      return i;
    }
  }
  return -1;
}

/** 해당 기능 흐름을 처리 */
function inferGroupPathFromTrimmedStack(trimmedFrames: StackFrame[], entry: AnyRecord | null | undefined, componentName: string | null | undefined) {
  if (!Array.isArray(trimmedFrames) || trimmedFrames.length === 0) return null;
  const maxFrames = Math.min(trimmedFrames.length, 24);
  return collectCustomHookPathFromFrames(trimmedFrames.slice(0, maxFrames), entry, componentName);
}

/** 입력 데이터를 표시/비교용으로 정규화 */
function normalizePrimitiveHookName(primitive: string | null | undefined, dispatcherHookName: string | null | undefined) {
  let name = parseHookDisplayName(primitive);
  if (!name && typeof primitive === "string" && primitive) {
    name = primitive;
  }
  if (name === "Context (use)") {
    name = "Context";
  }
  if (!name) {
    name = parseHookDisplayName(dispatcherHookName);
  }
  if (!name) return null;
  return name.charAt(0).toUpperCase() + name.slice(1);
}

/** 입력 데이터를 표시/비교용으로 정규화 */
function normalizeDispatcherRef(injectedRef: AnyRecord | null | undefined) {
  if (!injectedRef || typeof injectedRef !== "object") return null;
  if (typeof injectedRef.H !== "undefined") {
    return injectedRef;
  }
  if (typeof injectedRef.current !== "undefined") {
    return {
      get H() {
        return injectedRef.current;
      },
      set H(value) {
        injectedRef.current = value;
      },
    };
  }
  return null;
}

/** 필요한 값/상태를 계산해 반환 */
function getNestedValue(root: any, path: PathSegment[]) {
  let value = root;
  for (let i = 0; i < path.length; i += 1) {
    if (!value || (typeof value !== "object" && typeof value !== "function")) {
      return null;
    }
    value = value[path[i]];
  }
  return value;
}

/** 해당 기능 흐름을 처리 */
function parseCollectionPathIndex(segment: string, prefix: string) {
  if (typeof segment !== "string") return null;
  if (segment.indexOf(prefix) !== 0) return null;
  const raw = segment.slice(prefix.length);
  if (!/^\d+$/.test(raw)) return -1;
  const index = Number(raw);
  if (!Number.isFinite(index) || index < 0) return -1;
  return Math.floor(index);
}

/** 필요한 값/상태를 계산해 반환 */
function getMapValueAtIndex(mapValue: Map<unknown, unknown>, index: number) {
  let cursor = 0;
  for (const [, entryValue] of mapValue) {
    if (cursor === index) return { ok: true, value: entryValue };
    cursor += 1;
  }
  return { ok: false, error: "Map entry index out of range" };
}

/** 필요한 값/상태를 계산해 반환 */
function getMapEntryAtIndex(mapValue: Map<unknown, unknown>, index: number) {
  let cursor = 0;
  for (const [entryKey, entryValue] of mapValue) {
    if (cursor === index) return { ok: true, value: [entryKey, entryValue] };
    cursor += 1;
  }
  return { ok: false, error: "Map entry index out of range" };
}

/** 필요한 값/상태를 계산해 반환 */
function getSetValueAtIndex(setValue: Set<unknown>, index: number) {
  let cursor = 0;
  for (const entryValue of setValue) {
    if (cursor === index) return { ok: true, value: entryValue };
    cursor += 1;
  }
  return { ok: false, error: "Set entry index out of range" };
}

/** 입력/참조를 실제 대상으로 해석 */
function resolveSpecialCollectionPathSegment(currentValue: unknown, segment: string) {
  if (typeof Map !== "undefined" && currentValue instanceof Map) {
    const mapEntryIndex = parseCollectionPathIndex(segment, MAP_ENTRY_PATH_SEGMENT_PREFIX);
    if (mapEntryIndex !== null) {
      if (mapEntryIndex < 0) {
        return { handled: true, ok: false, error: "Invalid map entry segment" };
      }
      const resolved = getMapEntryAtIndex(currentValue, mapEntryIndex);
      if (!resolved.ok) {
        return { handled: true, ok: false, error: resolved.error };
      }
      return { handled: true, ok: true, value: resolved.value };
    }

    const mapValueIndex = parseCollectionPathIndex(segment, MAP_VALUE_PATH_SEGMENT_PREFIX);
    if (mapValueIndex !== null) {
      if (mapValueIndex < 0) {
        return { handled: true, ok: false, error: "Invalid map entry segment" };
      }
      const resolved = getMapValueAtIndex(currentValue, mapValueIndex);
      if (!resolved.ok) {
        return { handled: true, ok: false, error: resolved.error };
      }
      return { handled: true, ok: true, value: resolved.value };
    }
  }

  if (typeof Set !== "undefined" && currentValue instanceof Set) {
    const setEntryIndex = parseCollectionPathIndex(segment, SET_ENTRY_PATH_SEGMENT_PREFIX);
    if (setEntryIndex !== null) {
      if (setEntryIndex < 0) {
        return { handled: true, ok: false, error: "Invalid set entry segment" };
      }
      const resolved = getSetValueAtIndex(currentValue, setEntryIndex);
      if (!resolved.ok) {
        return { handled: true, ok: false, error: resolved.error };
      }
      return { handled: true, ok: true, value: resolved.value };
    }
  }

  return { handled: false };
}

/** 필요한 값/상태를 계산해 반환 */
function getDispatcherRefFromRenderer(renderer: AnyRecord | null | undefined) {
  if (!renderer || typeof renderer !== "object") return null;
  const candidates = [
    renderer.currentDispatcherRef,
    renderer.ReactCurrentDispatcher,
    renderer.currentDispatcher,
    getNestedValue(renderer, ["__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED", "ReactCurrentDispatcher"]),
    getNestedValue(renderer, ["__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED", "ReactSharedInternals"]),
    renderer.sharedInternals,
    renderer,
  ];

  for (let i = 0; i < candidates.length; i += 1) {
    const normalized = normalizeDispatcherRef(candidates[i]);
    if (normalized) return normalized;
  }
  return null;
}

/** 필요한 값/상태를 계산해 반환 */
function getDispatcherRefFromGlobalHook() {
  const globalHook = window.__REACT_DEVTOOLS_GLOBAL_HOOK__;
  if (!globalHook || !globalHook.renderers) return null;

  const rendererEntries = [];
  const renderers = globalHook.renderers;
  if (typeof renderers.forEach === "function") {
    renderers.forEach((renderer) => {
      rendererEntries.push(renderer);
    });
  } else if (Array.isArray(renderers)) {
    rendererEntries.push(...renderers);
  } else if (typeof renderers === "object") {
    for (const key in renderers) {
      rendererEntries.push(renderers[key]);
    }
  }

  for (let i = 0; i < rendererEntries.length; i += 1) {
    const renderer = rendererEntries[i];
    let dispatcherRef = getDispatcherRefFromRenderer(renderer);
    if (dispatcherRef) return dispatcherRef;
  }

  return null;
}

/** 입력/참조를 실제 대상으로 해석 */
function resolveRenderFunctionForHookInspect(fiber: FiberLike | null | undefined) {
  if (!fiber) return null;
  if (fiber.tag === 11 && fiber.type && typeof fiber.type.render === "function") {
    return fiber.type.render;
  }
  if (typeof fiber.type === "function") return fiber.type;
  if (fiber.type && typeof fiber.type === "object") {
    if (typeof fiber.type.type === "function") return fiber.type.type;
    if (typeof fiber.type.render === "function") return fiber.type.render;
  }
  if (typeof fiber.elementType === "function") return fiber.elementType;
  if (fiber.elementType && typeof fiber.elementType === "object") {
    if (typeof fiber.elementType.type === "function") return fiber.elementType.type;
    if (typeof fiber.elementType.render === "function") return fiber.elementType.render;
  }
  return null;
}

/** 입력/참조를 실제 대상으로 해석 */
function resolveDefaultPropsForHookInspect(type: AnyRecord | null | undefined, baseProps: AnyRecord | null | undefined) {
  if (type && type.defaultProps) {
    const props = {};
    if (baseProps && typeof baseProps === "object") {
      for (const key in baseProps) {
        props[key] = baseProps[key];
      }
    }
    const defaultProps = type.defaultProps;
    for (const propName in defaultProps) {
      if (props[propName] === undefined) {
        props[propName] = defaultProps[propName];
      }
    }
    return props;
  }
  return baseProps;
}

/** 경로 기준 inspect 동작을 수행 */
function inspectCustomHookGroupNames(fiber: FiberLike | null | undefined, expectedCount: number | null | undefined) {
  if (!fiber || fiber.tag === 1) return null;
  const renderFn = resolveRenderFunctionForHookInspect(fiber);
  if (typeof renderFn !== "function") return null;
  const componentName = getFiberName(fiber);

  const dispatcherRef = getDispatcherRefFromGlobalHook();
  if (!dispatcherRef || typeof dispatcherRef.H === "undefined") return null;

  const previousDispatcher = dispatcherRef.H;
  let currentHook = fiber.memoizedState;
  const hookLog = [];
  let rootStackError = null;
  let suspendedToken = null;

  function nextHook() {
    const hook = currentHook;
    if (hook && typeof hook === "object" && "next" in hook) {
      currentHook = hook.next;
    } else {
      currentHook = null;
    }
    return hook;
  }

  function readHookMemoizedState() {
    const hook = nextHook();
    if (hook && typeof hook === "object" && "memoizedState" in hook) {
      return hook.memoizedState;
    }
    return undefined;
  }

  function pushHookLog(primitive: string, dispatcherHookName: string, value: unknown) {
    if (hookLog.length >= 220) return;
    hookLog.push({
      primitive,
      dispatcherHookName,
      value,
      stackError: new Error(),
    });
  }

  function readContextSnapshot(context: AnyRecord | null | undefined) {
    if (!context || typeof context !== "object") {
      return { hasValue: false, value: undefined };
    }
    if ("_currentValue2" in context) {
      return { hasValue: true, value: context._currentValue2 };
    }
    if ("_currentValue" in context) {
      return { hasValue: true, value: context._currentValue };
    }
    return { hasValue: false, value: undefined };
  }

  const dispatcher = {
    readContext(context) {
      const snapshot = readContextSnapshot(context);
      pushHookLog("Context", "Context", snapshot.value);
      return snapshot.value;
    },
    useContext(context) {
      const snapshot = readContextSnapshot(context);
      pushHookLog("Context", "Context", snapshot.value);
      return snapshot.value;
    },
    useState(initialState) {
      const hook = nextHook();
      const state = hook && hook.memoizedState !== undefined
        ? hook.memoizedState
        : (typeof initialState === "function" ? initialState() : initialState);
      pushHookLog("State", "State", state);
      return [state, function() {}];
    },
    useReducer(reducer, initialArg, init) {
      const hook = nextHook();
      let state;
      if (hook && hook.memoizedState !== undefined) {
        state = hook.memoizedState;
      } else if (typeof init === "function") {
        state = init(initialArg);
      } else {
        state = initialArg;
      }
      pushHookLog("Reducer", "Reducer", state);
      return [state, function() {}];
    },
    useRef(initialValue) {
      const hook = nextHook();
      const value = hook && hook.memoizedState !== undefined ? hook.memoizedState : { current: initialValue };
      pushHookLog("Ref", "Ref", value);
      return value;
    },
    useEffect(create) {
      readHookMemoizedState();
      pushHookLog("Effect", "Effect", typeof create === "function" ? create : null);
    },
    useLayoutEffect(create) {
      readHookMemoizedState();
      pushHookLog("LayoutEffect", "LayoutEffect", typeof create === "function" ? create : null);
    },
    useInsertionEffect(create) {
      readHookMemoizedState();
      pushHookLog("InsertionEffect", "InsertionEffect", typeof create === "function" ? create : null);
    },
    useImperativeHandle(ref, create) {
      readHookMemoizedState();
      pushHookLog("ImperativeHandle", "ImperativeHandle", typeof create === "function" ? create : null);
    },
    useDebugValue(value) {
      pushHookLog("DebugValue", "DebugValue", value);
    },
    useCallback(callback) {
      const state = readHookMemoizedState();
      const value = Array.isArray(state) ? state[0] : callback;
      pushHookLog("Callback", "Callback", value);
      return value;
    },
    useMemo(create) {
      const state = readHookMemoizedState();
      const value = Array.isArray(state) ? state[0] : undefined;
      pushHookLog("Memo", "Memo", value);
      return value;
    },
    useDeferredValue(value) {
      const state = readHookMemoizedState();
      const nextValue = state !== undefined ? state : value;
      pushHookLog("DeferredValue", "DeferredValue", nextValue);
      return nextValue;
    },
    useTransition() {
      const stateHook = nextHook();
      nextHook();
      const pending = !!(stateHook && stateHook.memoizedState);
      pushHookLog("Transition", "Transition", pending);
      return [pending, function() {}];
    },
    useSyncExternalStore(subscribe, getSnapshot) {
      const hook = nextHook();
      nextHook();
      nextHook();
      const value = hook && hook.memoizedState !== undefined
        ? hook.memoizedState
        : (typeof getSnapshot === "function" ? getSnapshot() : undefined);
      pushHookLog("SyncExternalStore", "SyncExternalStore", value);
      return value;
    },
    useId() {
      const id = readHookMemoizedState();
      const nextId = typeof id === "string" ? id : "";
      pushHookLog("Id", "Id", nextId);
      return nextId;
    },
    useOptimistic(passthrough) {
      const state = readHookMemoizedState();
      const nextState = state !== undefined ? state : passthrough;
      pushHookLog("Optimistic", "Optimistic", nextState);
      return [nextState, function() {}];
    },
    useFormState(action, initialState) {
      const state = readHookMemoizedState();
      const nextState = state !== undefined ? state : initialState;
      pushHookLog("FormState", "FormState", nextState);
      return [nextState, function() {}];
    },
    useActionState(action, initialState) {
      const state = readHookMemoizedState();
      const nextState = state !== undefined ? state : initialState;
      pushHookLog("ActionState", "ActionState", nextState);
      return [nextState, function() {}, false];
    },
    useHostTransitionStatus() {
      const status = readHookMemoizedState();
      pushHookLog("HostTransitionStatus", "HostTransitionStatus", status);
      return status;
    },
    useEffectEvent(callback) {
      readHookMemoizedState();
      pushHookLog("EffectEvent", "EffectEvent", callback);
      return typeof callback === "function" ? callback : function() {};
    },
    useMemoCache(size) {
      readHookMemoizedState();
      pushHookLog("MemoCache", "MemoCache", size);
      const cache = [];
      for (let i = 0; i < size; i += 1) cache.push(undefined);
      return cache;
    },
    use(usable) {
      const state = readHookMemoizedState();
      if (usable && typeof usable === "object" && typeof usable.then === "function") {
        if (state !== undefined) {
          pushHookLog("Promise", "Use", state);
          return state;
        }
        pushHookLog("Unresolved", "Use", usable);
        if (suspendedToken === null) {
          suspendedToken = {};
        }
        throw suspendedToken;
      }
      const contextSnapshot = readContextSnapshot(usable);
      if (contextSnapshot.hasValue) {
        pushHookLog("Context", "Use", contextSnapshot.value);
        return contextSnapshot.value;
      }
      const fallbackValue = state !== undefined ? state : usable;
      pushHookLog("Use", "Use", fallbackValue);
      return fallbackValue;
    },
  };

  const dispatcherProxy = typeof Proxy === "function"
    ? new Proxy(dispatcher, {
      get(target, prop) {
        if (prop in target) return target[prop];
        if (typeof prop !== "string") return undefined;
        return function genericHookFallback(arg: unknown) {
          const state = readHookMemoizedState();
          const inferred = parseHookDisplayName(prop) || "Hook";
          const value = state !== undefined ? state : arg;
          pushHookLog(inferred, inferred, value);
          return value;
        };
      },
    })
    : dispatcher;

  function callWarmup(fn: () => unknown) {
    try {
      fn();
    } catch (_) {
      /** warmup 중 부수효과(unresolved use 등)는 무시한다. */
    }
  }

  function buildPrimitiveStackCache() {
    const cache = new Map();
    const warmupStartIndex = hookLog.length;
    const savedCurrentHook = currentHook;
    const savedSuspendedToken = suspendedToken;
    currentHook = null;
    suspendedToken = null;

    try {
      callWarmup(() => dispatcher.useContext({ _currentValue: null }));
      callWarmup(() => dispatcher.useState(null));
      callWarmup(() => dispatcher.useReducer((s) => s, null));
      callWarmup(() => dispatcher.useRef(null));
      callWarmup(() => dispatcher.useLayoutEffect(function() {}));
      callWarmup(() => dispatcher.useInsertionEffect(function() {}));
      callWarmup(() => dispatcher.useEffect(function() {}));
      callWarmup(() => dispatcher.useImperativeHandle(null, function() { return null; }));
      callWarmup(() => dispatcher.useDebugValue(null));
      callWarmup(() => dispatcher.useCallback(function() {}));
      callWarmup(() => dispatcher.useTransition());
      callWarmup(() => dispatcher.useSyncExternalStore(
        function() { return function() {}; },
        function() { return null; }
      ));
      callWarmup(() => dispatcher.useDeferredValue(null));
      callWarmup(() => dispatcher.useMemo(function() { return null; }));
      callWarmup(() => dispatcher.useOptimistic(null));
      callWarmup(() => dispatcher.useFormState((s) => s, null));
      callWarmup(() => dispatcher.useActionState((s) => s, null));
      callWarmup(() => dispatcher.useHostTransitionStatus());
      callWarmup(() => dispatcher.useId());
      callWarmup(() => dispatcher.useEffectEvent(function() {}));
      callWarmup(() => dispatcher.useMemoCache(0));
      callWarmup(() => dispatcher.use({ _currentValue: null }));
      callWarmup(() => dispatcher.use({
        then() {},
        status: "fulfilled",
        value: null,
      }));
      callWarmup(() => dispatcher.use({
        then() {},
      }));
    } finally {
      const warmupEntries = hookLog.splice(warmupStartIndex);
      for (let i = 0; i < warmupEntries.length; i += 1) {
        const entry = warmupEntries[i];
        if (!entry || !entry.primitive || cache.has(entry.primitive)) continue;
        cache.set(entry.primitive, parseErrorStackFrames(entry.stackError));
      }
      currentHook = savedCurrentHook;
      suspendedToken = savedSuspendedToken;
    }

    return cache;
  }

  const primitiveStackCache = buildPrimitiveStackCache();

  const originalConsoleMethods = {};
  for (const method in console) {
    try {
      originalConsoleMethods[method] = console[method];
      console[method] = function() {};
    } catch (_) {}
  }

  try {
    dispatcherRef.H = dispatcherProxy;
    rootStackError = new Error();
    let props = fiber.memoizedProps;
    if (fiber.type !== fiber.elementType) {
      props = resolveDefaultPropsForHookInspect(fiber.type, props);
    }
    if (fiber.tag === 11 && fiber.type && typeof fiber.type.render === "function") {
      renderFn(props, fiber.ref);
    } else {
      renderFn(props);
    }
  } catch (error) {
    if (suspendedToken && error === suspendedToken) {
      /** unresolved Promise(use) 경로는 정상 흐름으로 간주한다. */
    }
  } finally {
    dispatcherRef.H = previousDispatcher;
    for (const restoreMethod in originalConsoleMethods) {
      try {
        console[restoreMethod] = originalConsoleMethods[restoreMethod];
      } catch (_) {}
    }
  }

  if (hookLog.length === 0) return null;
  const rootFrames = parseErrorStackFrames(rootStackError);
  const groupNames = [];
  const groupPaths = [];
  const primitiveNames = [];
  const primitiveValues = [];
  const primitiveHasValue = [];

  for (let logIndex = 0; logIndex < hookLog.length; logIndex += 1) {
    const entry = hookLog[logIndex];
    const hookFrames = parseErrorStackFrames(entry.stackError);
    const rootIndex = findCommonAncestorFrameIndex(rootFrames, hookFrames);
    const primitiveIndex = findPrimitiveFrameIndex(hookFrames, entry, primitiveStackCache);

    let trimmedStack = null;
    if (rootIndex !== -1 && primitiveIndex !== -1 && rootIndex - primitiveIndex >= 2) {
      trimmedStack = hookFrames.slice(primitiveIndex, rootIndex - 1);
    }

    let groupPath = inferGroupPathFromTrimmedStack(trimmedStack, entry, componentName);
    if (!groupPath || groupPath.length === 0) {
      groupPath = inferGroupPathFromAllFrames(hookFrames, entry, componentName);
    }

    groupPaths.push(groupPath && groupPath.length > 0 ? groupPath : null);
    groupNames.push(groupPath && groupPath.length > 0 ? groupPath[groupPath.length - 1] : null);
    primitiveNames.push(normalizePrimitiveHookName(entry.primitive, entry.dispatcherHookName));
    primitiveValues.push(entry.value);
    primitiveHasValue.push(true);
  }

  if (typeof expectedCount === "number" && expectedCount >= 0) {
    while (groupNames.length < expectedCount) {
      groupNames.push(null);
    }
    if (groupNames.length > expectedCount) {
      groupNames.length = expectedCount;
    }

    while (groupPaths.length < expectedCount) {
      groupPaths.push(null);
    }
    if (groupPaths.length > expectedCount) {
      groupPaths.length = expectedCount;
    }

    while (primitiveNames.length < expectedCount) {
      primitiveNames.push(null);
    }
    if (primitiveNames.length > expectedCount) {
      primitiveNames.length = expectedCount;
    }

    while (primitiveValues.length < expectedCount) {
      primitiveValues.push(undefined);
    }
    if (primitiveValues.length > expectedCount) {
      primitiveValues.length = expectedCount;
    }

    while (primitiveHasValue.length < expectedCount) {
      primitiveHasValue.push(false);
    }
    if (primitiveHasValue.length > expectedCount) {
      primitiveHasValue.length = expectedCount;
    }
  }

  return {
    groupNames,
    groupPaths,
    primitiveNames,
    primitiveValues,
    primitiveHasValue,
  };
}

/** 해당 기능 흐름을 처리 */
function inferHookName(node: AnyRecord | null | undefined, index: number, hookTypes: unknown[] | null) {
  let hookTypeName = null;
  if (hookTypes && typeof hookTypes[index] === "string" && hookTypes[index]) {
    hookTypeName = parseHookDisplayName(String(hookTypes[index]).trim());
    if (hookTypeName) {
      hookTypeName = hookTypeName.charAt(0).toUpperCase() + hookTypeName.slice(1);
    }
  }
  if (!node || typeof node !== "object") return "Hook#" + String(index + 1);

  const memoizedState = node.memoizedState;
  if (node.queue && typeof node.queue === "object") {
    const reducer = node.queue.lastRenderedReducer;
    if (typeof reducer === "function") {
      const reducerName = reducer.name || "";
      if (reducerName && reducerName !== "basicStateReducer") return "Reducer";
      if (hookTypeName === "Reducer") return "Reducer";
      if (hookTypeName === "State") return "State";
      if (reducerName === "basicStateReducer") return "State";
      return "Reducer";
    }
    if (hookTypeName === "Reducer") return "Reducer";
    if (hookTypeName === "State") return "State";
    return "State";
  }
  if (hookTypeName) return hookTypeName;
  if (
    memoizedState
    && typeof memoizedState === "object"
    && "current" in memoizedState
    && !Array.isArray(memoizedState)
  ) {
    return "Ref";
  }
  if (Array.isArray(memoizedState) && memoizedState.length === 2 && Array.isArray(memoizedState[1])) {
    return typeof memoizedState[0] === "function" ? "Callback" : "Memo";
  }
  if (
    memoizedState
    && typeof memoizedState === "object"
    && ("create" in memoizedState || "destroy" in memoizedState)
  ) {
    return "Effect";
  }
  return "Hook#" + String(index + 1);
}

/** 표시/전달용 값으로 변환 */
function toRefCurrentDisplayValue(value: unknown) {
  if (typeof Element !== "undefined" && value instanceof Element) {
    const tagName = String(value.tagName || "").toLowerCase();
    return tagName ? `<${tagName} />` : "<element />";
  }
  return value;
}

/** 입력 데이터를 표시/비교용으로 정규화 */
function normalizeHookStateForDisplay(hookName: string, state: unknown) {
  if (hookName !== "Ref") return state;
  if (state && typeof state === "object" && !Array.isArray(state) && "current" in state) {
    return toRefCurrentDisplayValue(state.current);
  }
  return toRefCurrentDisplayValue(state);
}

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
    const customMetadata = inspectCustomHookGroupNames(fiber);
    if (customMetadata && typeof customMetadata === "object") {
      const customGroups = Array.isArray(customMetadata.groupNames)
        ? customMetadata.groupNames
        : null;
      const customGroupPaths = Array.isArray(customMetadata.groupPaths)
        ? customMetadata.groupPaths
        : null;
      const primitiveNames = Array.isArray(customMetadata.primitiveNames)
        ? customMetadata.primitiveNames
        : null;
      const primitiveValues = Array.isArray(customMetadata.primitiveValues)
        ? customMetadata.primitiveValues
        : null;
      const primitiveHasValue = Array.isArray(customMetadata.primitiveHasValue)
        ? customMetadata.primitiveHasValue
        : null;

      const metadataLength = Math.max(
        hooks.length,
        customGroups ? customGroups.length : 0,
        customGroupPaths ? customGroupPaths.length : 0,
        primitiveNames ? primitiveNames.length : 0,
        primitiveValues ? primitiveValues.length : 0,
        primitiveHasValue ? primitiveHasValue.length : 0
      );

      while (hooks.length < metadataLength) {
        const index = hooks.length;
        let fallbackName = "Hook#" + String(index + 1);
        if (primitiveNames && typeof primitiveNames[index] === "string" && primitiveNames[index]) {
          fallbackName = primitiveNames[index];
        }
        let fallbackState = undefined;
        if (primitiveValues && primitiveHasValue && primitiveHasValue[index] === true) {
          fallbackState = primitiveValues[index];
        }
        hooks.push({
          index,
          name: fallbackName,
          state: fallbackState,
          group: null,
          groupPath: null,
        });
      }

      for (let i = 0; i < hooks.length; i += 1) {
        if (primitiveNames) {
          const primitiveName = primitiveNames[i];
          if (typeof primitiveName === "string" && primitiveName) {
            hooks[i].name = primitiveName;
          }
        }
        if (primitiveValues && primitiveHasValue && primitiveHasValue[i] === true) {
          hooks[i].state = primitiveValues[i];
        }
        if (customGroups) {
          const groupName = customGroups[i];
          if (typeof groupName === "string" && groupName) {
            hooks[i].group = groupName;
          }
        }
        if (customGroupPaths) {
          const groupPath = customGroupPaths[i];
          if (Array.isArray(groupPath) && groupPath.length > 0) {
            hooks[i].groupPath = groupPath.filter((item) => typeof item === "string" && item);
          } else {
            hooks[i].groupPath = null;
          }
        }
      }
    }
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

/** 해당 기능 흐름을 처리 */
function makeSerializer(optionsOrMaxSerializeCalls: number | SerializerOptions) {
  const seenMap = typeof WeakMap === "function" ? new WeakMap() : null;
  const seenList = [];
  let nextId = 1;

  const normalizedOptions =
    typeof optionsOrMaxSerializeCalls === "number"
      ? { maxSerializeCalls: optionsOrMaxSerializeCalls }
      : (optionsOrMaxSerializeCalls || {});

  const MAX_SERIALIZE_CALLS =
    typeof normalizedOptions.maxSerializeCalls === "number" &&
    normalizedOptions.maxSerializeCalls > 0
      ? normalizedOptions.maxSerializeCalls
      : 30000;
  const MAX_DEPTH =
    typeof normalizedOptions.maxDepth === "number" && normalizedOptions.maxDepth >= 0
      ? Math.floor(normalizedOptions.maxDepth)
      : 4;
  const MAX_ARRAY_LENGTH =
    typeof normalizedOptions.maxArrayLength === "number" &&
    normalizedOptions.maxArrayLength > 0
      ? Math.floor(normalizedOptions.maxArrayLength)
      : 120;
  const MAX_OBJECT_KEYS =
    typeof normalizedOptions.maxObjectKeys === "number" && normalizedOptions.maxObjectKeys > 0
      ? Math.floor(normalizedOptions.maxObjectKeys)
      : 140;
  const MAX_MAP_ENTRIES =
    typeof normalizedOptions.maxMapEntries === "number" && normalizedOptions.maxMapEntries > 0
      ? Math.floor(normalizedOptions.maxMapEntries)
      : 120;
  const MAX_SET_ENTRIES =
    typeof normalizedOptions.maxSetEntries === "number" && normalizedOptions.maxSetEntries > 0
      ? Math.floor(normalizedOptions.maxSetEntries)
      : 120;

  let serializeCalls = 0;
  let limitReached = false;

  function mapInternalKey(key: string) {
    if (key === "_owner") return "[ReactOwner]";
    if (
      key === "_store"
      || key === "__self"
      || key === "__source"
      || key === "_debugOwner"
      || key === "_debugSource"
    ) {
      return "[ReactInternal]";
    }
    return null;
  }

  function findSeenId(value: object) {
    if (seenMap) {
      const idFromMap = seenMap.get(value);
      return typeof idFromMap === "number" ? idFromMap : null;
    }
    for (let i = 0; i < seenList.length; i += 1) {
      if (seenList[i].value === value) return seenList[i].id;
    }
    return null;
  }

  function rememberSeen(value: object, id: number) {
    if (seenMap) {
      seenMap.set(value, id);
      return;
    }
    seenList.push({ value, id });
  }

  function buildDehydratedToken(value: unknown, reason: string) {
    try {
      if (Array.isArray(value)) {
        return {
          __ecType: "dehydrated",
          valueType: "array",
          size: value.length,
          preview: "Array(" + String(value.length) + ")",
          reason,
        };
      }
      if (typeof Map !== "undefined" && value instanceof Map) {
        return {
          __ecType: "dehydrated",
          valueType: "map",
          size: value.size,
          preview: "Map(" + String(value.size) + ")",
          reason,
        };
      }
      if (typeof Set !== "undefined" && value instanceof Set) {
        return {
          __ecType: "dehydrated",
          valueType: "set",
          size: value.size,
          preview: "Set(" + String(value.size) + ")",
          reason,
        };
      }
      if (value && typeof value === "object") {
        let keyCount = 0;
        try {
          keyCount = Object.keys(value).length;
        } catch (_) {
          keyCount = 0;
        }
        const className = readObjectClassName(value);
        const displayName = className || "Object";
        return {
          __ecType: "dehydrated",
          valueType: "object",
          size: keyCount,
          preview: displayName + "(" + String(keyCount) + ")",
          reason,
        };
      }
    } catch (_) {}

    return {
      __ecType: "dehydrated",
      valueType: "unknown",
      preview: "{…}",
      reason,
    };
  }

  function readObjectClassName(value: unknown): string | null {
    if (!value || typeof value !== "object") return null;
    try {
      const proto = Object.getPrototypeOf(value);
      if (!proto || proto === Object.prototype) return null;
      const ctor = proto.constructor;
      if (!ctor || typeof ctor !== "function") return null;
      const name = typeof ctor.name === "string" ? ctor.name.trim() : "";
      if (!name || name === "Object") return null;
      return name;
    } catch (_) {
      return null;
    }
  }

  function serializeValue(value: unknown, depth: number | undefined) {
    const level = typeof depth === "number" ? depth : 0;
    if (value === null) return null;

    const t = typeof value;
    if (t === "undefined") return undefined;
    if (t === "string" || t === "number" || t === "boolean") return value;
    if (t === "bigint") return String(value) + "n";
    if (t === "symbol") return String(value);
    if (t === "function") {
      return {
        __ecType: "function",
        name: value.name || "",
      };
    }
    if (t !== "object") return String(value);

    if (level >= MAX_DEPTH) {
      return buildDehydratedToken(value, "depth");
    }

    if (limitReached) {
      return buildDehydratedToken(value, "maxSerializeCalls");
    }
    serializeCalls += 1;
    if (serializeCalls > MAX_SERIALIZE_CALLS) {
      limitReached = true;
      return buildDehydratedToken(value, "maxSerializeCalls");
    }

    const existingId = findSeenId(value);
    if (existingId !== null) {
      return {
        __ecType: "circularRef",
        refId: existingId,
      };
    }

    if (typeof Element !== "undefined" && value instanceof Element) {
      const elementName = String(value.tagName || "").toLowerCase();
      const suffix = value.id ? "#" + value.id : "";
      return "[Element " + elementName + suffix + "]";
    }
    if (typeof Window !== "undefined" && value instanceof Window) return "[Window]";

    const id = nextId++;
    rememberSeen(value, id);

    try {
      if (Array.isArray(value)) {
        const arr = [];
        try { arr.__ecRefId = id; } catch (_) {}
        const maxLen = Math.min(value.length, MAX_ARRAY_LENGTH);
        for (let i = 0; i < maxLen; i += 1) {
          arr.push(serializeValue(value[i], level + 1));
          if (limitReached) break;
        }
        const serializedLen = arr.length;
        if (value.length > serializedLen) {
          arr.push("[+" + String(value.length - serializedLen) + " more]");
        } else if (limitReached) {
          arr.push("[TruncatedBySerializeLimit]");
        }
        return arr;
      }

      if (typeof Map !== "undefined" && value instanceof Map) {
        const out = {
          __ecType: "map",
          size: value.size,
          entries: [],
        };
        try { out.__ecRefId = id; } catch (_) {}
        const maxEntries = Math.min(value.size, MAX_MAP_ENTRIES);
        let entryIndex = 0;
        for (const [entryKey, entryValue] of value) {
          if (entryIndex >= maxEntries) break;
          out.entries.push([
            serializeValue(entryKey, level + 1),
            serializeValue(entryValue, level + 1),
          ]);
          entryIndex += 1;
          if (limitReached) break;
        }
        if (value.size > out.entries.length) {
          out.__truncated__ = "[+" + String(value.size - out.entries.length) + " entries]";
        } else if (limitReached) {
          out.__truncated__ = "[TruncatedBySerializeLimit]";
        }
        return out;
      }

      if (typeof Set !== "undefined" && value instanceof Set) {
        const out = {
          __ecType: "set",
          size: value.size,
          entries: [],
        };
        try { out.__ecRefId = id; } catch (_) {}
        const maxEntries = Math.min(value.size, MAX_SET_ENTRIES);
        let entryIndex = 0;
        for (const entryValue of value) {
          if (entryIndex >= maxEntries) break;
          out.entries.push(serializeValue(entryValue, level + 1));
          entryIndex += 1;
          if (limitReached) break;
        }
        if (value.size > out.entries.length) {
          out.__truncated__ = "[+" + String(value.size - out.entries.length) + " entries]";
        } else if (limitReached) {
          out.__truncated__ = "[TruncatedBySerializeLimit]";
        }
        return out;
      }

      const out = {};
      try { out.__ecRefId = id; } catch (_) {}
      const keys = Object.keys(value);
      const maxKeys = Math.min(keys.length, MAX_OBJECT_KEYS);
      for (let j = 0; j < maxKeys; j += 1) {
        const key = keys[j];
        const internalReplacement = mapInternalKey(key);
        if (internalReplacement) {
          out[key] = internalReplacement;
          continue;
        }
        if (key === "children") {
          try {
            out.children = summarizeChildrenValue(value[key]);
          } catch (e3) {
            out.children = "[Thrown: " + String(e3 && e3.message) + "]";
          }
          continue;
        }
        try {
          out[key] = serializeValue(value[key], level + 1);
        } catch (e) {
          out[key] = "[Thrown: " + String(e && e.message) + "]";
        }
        if (limitReached) break;
      }
      if (keys.length > maxKeys) {
        out.__truncated__ = "[+" + String(keys.length - maxKeys) + " keys]";
      } else if (limitReached) {
        out.__truncated__ = "[TruncatedBySerializeLimit]";
      }
      const objectClassName = readObjectClassName(value);
      if (objectClassName) {
        out[OBJECT_CLASS_NAME_META_KEY] = objectClassName;
      }
      return out;
    } catch (e2) {
      return String(value);
    }
  }

  return serializeValue;
}

/** 필요한 값/상태를 계산해 반환 */
function getReactLikeTypeName(type: unknown) {
  if (!type) return "Unknown";
  if (typeof type === "string") return type;
  if (typeof type === "function") return type.displayName || type.name || "Anonymous";
  if (typeof type === "object") {
    if (typeof type.displayName === "string" && type.displayName) return type.displayName;
    if (typeof type.render === "function") return type.render.displayName || type.render.name || "Anonymous";
    if (type.type) return getReactLikeTypeName(type.type);
  }
  return "Unknown";
}

/** 해당 기능 흐름을 처리 */
function summarizeChildrenValue(value: unknown, depth: number | undefined) {
  const level = typeof depth === "number" ? depth : 0;
  if (value == null) return value;
  if (typeof value === "string") return value.length > 120 ? value.slice(0, 120) + "…" : value;
  if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") return value;
  if (typeof value === "function") return "[Function " + (value.name || "") + "]";

  if (Array.isArray(value)) {
    if (level >= 2) return "[ChildrenArray len=" + String(value.length) + "]";
    const maxLen = Math.min(value.length, 6);
    const arr = [];
    for (let i = 0; i < maxLen; i += 1) {
      arr.push(summarizeChildrenValue(value[i], level + 1));
    }
    if (value.length > maxLen) {
      arr.push("[+" + String(value.length - maxLen) + " more]");
    }
    return arr;
  }

  if (typeof value === "object") {
    if (value.$$typeof && ("type" in value || "props" in value)) {
      const typeName = getReactLikeTypeName(value.type);
      const keyText = value.key == null ? "" : " key=" + String(value.key);
      return "[ReactElement " + typeName + keyText + "]";
    }

    if (level >= 2) return "[ChildrenObject]";

    const out = {};
    const keys = Object.keys(value);
    const maxKeys = Math.min(keys.length, 4);
    for (let j = 0; j < maxKeys; j += 1) {
      const key = keys[j];
      if (
        key === "_owner"
        || key === "_store"
        || key === "__self"
        || key === "__source"
        || key === "_debugOwner"
        || key === "_debugSource"
      ) {
        out[key] = key === "_owner" ? "[ReactOwner]" : "[ReactInternal]";
        continue;
      }
      try {
        out[key] = summarizeChildrenValue(value[key], level + 1);
      } catch (e) {
        out[key] = "[Thrown: " + String(e && e.message) + "]";
      }
    }
    if (keys.length > maxKeys) out.__truncated__ = "[+" + String(keys.length - maxKeys) + " keys]";
    return out;
  }

  return String(value);
}

/** 해당 기능 흐름을 처리 */
function serializePropsForFiber(fiber: FiberLike | null | undefined, serialize: (value: unknown, depth?: number) => unknown) {
  const props = fiber ? fiber.memoizedProps : null;
  if (props && typeof props === "object" && !Array.isArray(props)) {
    const out = {};
    const keys = Object.keys(props);
    const isHostFiber = fiber && fiber.tag === 5;
    const maxKeys = Math.min(keys.length, isHostFiber ? 100 : 180);
    const perKeyBudget = isHostFiber ? 7000 : 18000;

    for (let i = 0; i < maxKeys; i += 1) {
      const key = keys[i];
      if (key === "children") {
        try {
          out.children = summarizeChildrenValue(props.children);
        } catch (e) {
          out.children = "[Thrown: " + String(e && e.message) + "]";
        }
        continue;
      }
      try {
        const propSerialize = makeSerializer({
          maxSerializeCalls: perKeyBudget,
          maxDepth: 2,
          maxArrayLength: 80,
          maxObjectKeys: 80,
          maxMapEntries: 60,
          maxSetEntries: 60,
        });
        out[key] = propSerialize(props[key]);
      } catch (e2) {
        out[key] = "[Thrown: " + String(e2 && e2.message) + "]";
      }
    }
    if (keys.length > maxKeys) out.__truncated__ = "[+" + String(keys.length - maxKeys) + " keys]";
    return out;
  }
  return serialize(props);
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

/** 해당 기능 흐름을 처리 */
function rootHasComponentId(rootFiber: FiberLike | null | undefined, componentId: string | null | undefined, fiberIdMap: WeakMap<object, string>) {
  if (!rootFiber || !componentId) return false;
  const stack = [rootFiber];
  let guard = 0;
  while (stack.length > 0 && guard < MAX_TRAVERSAL) {
    const node = stack.pop();
    if (!node) {
      guard += 1;
      continue;
    }
    if (isInspectableTag(node.tag)) {
      const stableId = getStableFiberId(node, fiberIdMap);
      if (stableId === componentId) {
        return true;
      }
    }
    if (node.sibling) stack.push(node.sibling);
    if (node.child) stack.push(node.child);
    guard += 1;
  }
  return false;
}

/** 조건에 맞는 대상을 탐색 */
function findRootFiberByComponentId(componentId: string | null | undefined, fiberIdMap: WeakMap<object, string>) {
  if (!componentId) return null;
  const rootEl = document.body || document.documentElement;
  if (!rootEl) return null;

  const queue = [rootEl];
  let cursor = 0;
  let guard = 0;
  const maxScan = 7000;
  const visitedRoots = typeof WeakSet === "function" ? new WeakSet() : [];

  function hasVisited(root: FiberLike | null | undefined) {
    if (!root) return true;
    if (visitedRoots instanceof WeakSet) return visitedRoots.has(root);
    for (let i = 0; i < visitedRoots.length; i += 1) {
      if (visitedRoots[i] === root) return true;
    }
    return false;
  }

  function markVisited(root: FiberLike | null | undefined) {
    if (!root) return;
    if (visitedRoots instanceof WeakSet) {
      visitedRoots.add(root);
      return;
    }
    visitedRoots.push(root);
  }

  while (cursor < queue.length && guard < maxScan) {
    const current = queue[cursor++];
    const fiber = getReactFiberFromElement(current);
    if (fiber) {
      const rootFiber = findRootFiber(fiber);
      if (rootFiber && !hasVisited(rootFiber)) {
        markVisited(rootFiber);
        if (rootHasComponentId(rootFiber, componentId, fiberIdMap)) {
          return rootFiber;
        }
      }
    }

    const children = current.children;
    if (children && children.length) {
      for (let c = 0; c < children.length; c += 1) {
        queue.push(children[c]);
      }
    }
    guard += 1;
  }

  return null;
}

/** 필요한 값/상태를 계산해 반환 */
function getHostElementFromFiber(fiber: FiberLike | null | undefined, cache: Map<object, Element | null>, visiting: Set<object>) {
  if (!fiber) return null;
  if (cache.has(fiber)) return cache.get(fiber);
  if (visiting.has(fiber)) return null;
  visiting.add(fiber);

  let result = null;
  if (fiber.tag === 5 && fiber.stateNode && fiber.stateNode.nodeType === 1) {
    result = fiber.stateNode;
  } else {
    let child = fiber.child;
    let guard = 0;
    while (child && guard < 900) {
      result = getHostElementFromFiber(child, cache, visiting);
      if (result) break;
      child = child.sibling;
      guard += 1;
    }
  }

  visiting.delete(fiber);
  cache.set(fiber, result);
  return result;
}

/** 필요한 값/상태를 계산해 반환 */
function getDomInfoForFiber(fiber: FiberLike | null | undefined, hostCache: Map<object, Element | null>, visiting: Set<object>, selectedEl: Element | null) {
  const element = getHostElementFromFiber(fiber, hostCache, visiting);
  if (!element) {
    return { domSelector: null, domPath: null, domTagName: null, containsTarget: false };
  }
  const selectorText = buildCssSelector(element);
  let containsTarget = false;
  if (selectedEl && selectedEl.nodeType === 1) {
    try {
      containsTarget = element === selectedEl || element.contains(selectedEl);
    } catch (_) {
      containsTarget = false;
    }
  }
  return {
    domSelector: selectorText || null,
    domPath: getElementPath(element),
    domTagName: String(element.tagName || "").toLowerCase(),
    containsTarget,
  };
}

/** 경로 기준 inspect 동작을 수행 */
function inspectReactComponents(args: AnyRecord | null | undefined) {
  const selector = typeof args?.selector === "string" ? args.selector : "";
  const pickPoint = args?.pickPoint;
  const includeSerializedData = args?.includeSerializedData !== false;
  const selectedComponentId = typeof args?.selectedComponentId === "string" && args.selectedComponentId
    ? args.selectedComponentId
    : null;

  try {
    const targetEl = resolveTargetElement(selector, pickPoint);
    let nearest = targetEl ? findNearestFiber(targetEl) : null;
    if (!nearest || !nearest.fiber) {
      nearest = findAnyFiberInDocument();
    }
    if (!nearest || !nearest.fiber) {
      return { error: "React fiber를 찾을 수 없습니다. (React 16+ 필요)", selector, pickPoint };
    }

    let rootFiber = findRootFiber(nearest.fiber);
    if (!rootFiber) {
      return { error: "React root fiber를 찾을 수 없습니다.", selector };
    }

    const hostCache = new Map();
    const visiting = new Set();
    const fiberIdMap = getFiberIdMap();

    if (selectedComponentId && !includeSerializedData && !selector && !rootHasComponentId(rootFiber, selectedComponentId, fiberIdMap)) {
      const matchedRoot = findRootFiberByComponentId(selectedComponentId, fiberIdMap);
      if (matchedRoot) {
        rootFiber = matchedRoot;
      }
    }

    const components = [];
    const idByFiber = new Map();
    let targetMatchedIndex = -1;
    let targetMatchedDepth = -1;

    const stack = [{ fiber: rootFiber, depth: -1, parentId: null }];
    let walkGuard = 0;

    while (stack.length > 0 && walkGuard < MAX_TRAVERSAL && components.length < MAX_COMPONENTS) {
      const item = stack.pop();
      const node = item.fiber;
      if (!node) {
        walkGuard += 1;
        continue;
      }

      let childDepth = item.depth;
      let childParentId = item.parentId;

      if (isInspectableTag(node.tag)) {
        const domInfo = getDomInfoForFiber(node, hostCache, visiting, targetEl);
        const id = getStableFiberId(node, fiberIdMap) || String(components.length);
        const componentDepth = item.depth + 1;
        const shouldSerializeData = includeSerializedData || Boolean(selectedComponentId && id === selectedComponentId);

        let serializedProps = null;
        let serializedHooks = null;
        let hookCount = 0;

        if (shouldSerializeData) {
          const hooksInfo = getHooksInfo(node);
          serializedProps = serializePropsForFiber(
            node,
            makeSerializer({
              maxSerializeCalls: 32000,
              maxDepth: 2,
              maxArrayLength: 80,
              maxObjectKeys: 80,
              maxMapEntries: 60,
              maxSetEntries: 60,
            }),
          );
          serializedHooks = hooksInfo.value;
          hookCount = hooksInfo.count;
        } else {
          hookCount = getHooksCount(node);
        }

        if (domInfo.containsTarget && node.tag !== 5 && componentDepth >= targetMatchedDepth) {
          targetMatchedDepth = componentDepth;
          targetMatchedIndex = components.length;
        }

        components.push({
          id,
          parentId: item.parentId,
          name: getFiberName(node),
          kind: getFiberKind(node.tag),
          depth: componentDepth,
          props: serializedProps,
          hooks: serializedHooks,
          hookCount,
          hasSerializedData: shouldSerializeData,
          domSelector: domInfo.domSelector,
          domPath: domInfo.domPath,
          domTagName: domInfo.domTagName,
        });

        idByFiber.set(node, id);
        if (node.alternate) {
          idByFiber.set(node.alternate, id);
        }
        childDepth = item.depth + 1;
        childParentId = id;
      }

      if (node.sibling) {
        stack.push({ fiber: node.sibling, depth: item.depth, parentId: item.parentId });
      }
      if (node.child) {
        stack.push({ fiber: node.child, depth: childDepth, parentId: childParentId });
      }

      walkGuard += 1;
    }

    if (components.length === 0) {
      return { error: "분석 가능한 React 컴포넌트를 찾지 못했습니다.", selector };
    }

    const preferredFiber = findPreferredSelectedFiber(nearest.fiber);
    let selectedIndex = -1;

    if (preferredFiber && idByFiber.has(preferredFiber)) {
      const preferredId = idByFiber.get(preferredFiber);
      for (let idx = 0; idx < components.length; idx += 1) {
        if (components[idx].id === preferredId) {
          selectedIndex = idx;
          break;
        }
      }
    }

    if (selectedIndex < 0 && targetMatchedIndex >= 0 && targetMatchedIndex < components.length) {
      selectedIndex = targetMatchedIndex;
    }

    if (selectedIndex < 0 && preferredFiber) {
      const preferredDomInfo = getDomInfoForFiber(preferredFiber, hostCache, visiting, targetEl);
      if (preferredDomInfo && preferredDomInfo.domSelector) {
        let bestDepth = -1;
        for (let d = 0; d < components.length; d += 1) {
          const candidate = components[d];
          if (candidate.kind === "HostComponent") continue;
          if (candidate.domSelector !== preferredDomInfo.domSelector) continue;
          if (candidate.depth >= bestDepth) {
            bestDepth = candidate.depth;
            selectedIndex = d;
          }
        }
      }
    }

    if (selectedIndex < 0) {
      for (let i = 0; i < components.length; i += 1) {
        if (components[i].kind !== "HostComponent") {
          selectedIndex = i;
          break;
        }
      }
    }

    if (selectedIndex < 0) selectedIndex = 0;

    return {
      selector,
      selectedIndex,
      sourceElement: nearest.sourceElement ? {
        selector: buildCssSelector(nearest.sourceElement),
        domPath: getElementPath(nearest.sourceElement),
        tagName: String(nearest.sourceElement.tagName || "").toLowerCase(),
      } : null,
      rootSummary: {
        totalComponents: components.length,
      },
      components,
    };
  } catch (e) {
    return { error: String(e && e.message) };
  }
}

/** 조건에 맞는 대상을 탐색 */
function findFiberByComponentId(rootFiber: FiberLike | null | undefined, targetId: string | null | undefined, fiberIdMap: WeakMap<object, string>) {
  if (!rootFiber || !targetId) return null;
  const stack = [rootFiber];
  let guard = 0;
  let inspectableIndex = 0;

  while (stack.length > 0 && guard < MAX_TRAVERSAL) {
    const node = stack.pop();
    if (!node) {
      guard += 1;
      continue;
    }
    if (isInspectableTag(node.tag)) {
      const legacyId = String(inspectableIndex);
      const stableId = getStableFiberId(node, fiberIdMap);
      if (stableId === targetId || legacyId === targetId) return node;
      inspectableIndex += 1;
    }
    if (node.sibling) stack.push(node.sibling);
    if (node.child) stack.push(node.child);
    guard += 1;
  }

  return null;
}

/** 조건에 맞는 대상을 탐색 */
function findFiberByComponentIdAcrossDocument(targetId: string | null | undefined, fiberIdMap: WeakMap<object, string>) {
  if (!targetId) return null;
  const rootEl = document.body || document.documentElement;
  if (!rootEl) return null;

  const queue = [rootEl];
  let cursor = 0;
  let guard = 0;
  const maxScan = 8000;
  const visitedRoots = typeof WeakSet === "function" ? new WeakSet() : [];

  function hasVisited(root: FiberLike | null | undefined) {
    if (!root) return true;
    if (visitedRoots instanceof WeakSet) return visitedRoots.has(root);
    for (let i = 0; i < visitedRoots.length; i += 1) {
      if (visitedRoots[i] === root) return true;
    }
    return false;
  }

  function markVisited(root: FiberLike | null | undefined) {
    if (!root) return;
    if (visitedRoots instanceof WeakSet) {
      visitedRoots.add(root);
      return;
    }
    visitedRoots.push(root);
  }

  while (cursor < queue.length && guard < maxScan) {
    const current = queue[cursor++];
    const fiber = getReactFiberFromElement(current);
    if (fiber) {
      const rootFiber = findRootFiber(fiber);
      if (rootFiber && !hasVisited(rootFiber)) {
        markVisited(rootFiber);
        const found = findFiberByComponentId(rootFiber, targetId, fiberIdMap);
        if (found) return found;
      }
    }

    const children = current.children;
    if (children && children.length) {
      for (let i = 0; i < children.length; i += 1) {
        queue.push(children[i]);
      }
    }
    guard += 1;
  }

  return null;
}

/** 경로 기준 inspect 동작을 수행 */
function inspectReactPath(args: AnyRecord | null | undefined) {
  const componentId = typeof args?.componentId === "string" ? args.componentId : "";
  const selector = typeof args?.selector === "string" ? args.selector : "";
  const pickPoint = args?.pickPoint;
  const section = args?.section === "hooks" ? "hooks" : "props";
  const path = Array.isArray(args?.path) ? args.path : [];
  const mode = args?.mode === "inspectFunction" ? "inspectFunction" : "serializeValue";
  const serializeLimit = Number.isFinite(args?.serializeLimit) ? Math.max(1000, Math.floor(args.serializeLimit)) : 45000;

  try {
    if (!componentId) {
      return { ok: false, error: "componentId가 필요합니다." };
    }

    const targetEl = resolveTargetElement(selector, pickPoint);
    let nearest = targetEl ? findNearestFiber(targetEl) : null;
    if (!nearest || !nearest.fiber) {
      nearest = findAnyFiberInDocument();
    }
    if (!nearest || !nearest.fiber) {
      return { ok: false, error: "React fiber를 찾지 못했습니다." };
    }

    const fiberIdMap = getFiberIdMap();
    let rootFiber = findRootFiber(nearest.fiber);
    if (!rootFiber) {
      return { ok: false, error: "React root fiber를 찾지 못했습니다." };
    }

    let targetFiber = findFiberByComponentId(rootFiber, componentId, fiberIdMap);
    if (!targetFiber) {
      targetFiber = findFiberByComponentIdAcrossDocument(componentId, fiberIdMap);
    }
    if (!targetFiber) {
      return { ok: false, error: "대상 컴포넌트를 찾지 못했습니다." };
    }

    let value = section === "props"
      ? targetFiber.memoizedProps
      : getHooksRootValue(targetFiber, { includeCustomGroups: true });
    for (let i = 0; i < path.length; i += 1) {
      if (value == null) {
        return { ok: false, error: "함수 경로가 유효하지 않습니다.", failedAt: path[i] };
      }
      const segment = path[i];
      const specialResolved = resolveSpecialCollectionPathSegment(value, segment);
      if (specialResolved.handled) {
        if (!specialResolved.ok) {
          return {
            ok: false,
            error: "함수 경로가 유효하지 않습니다.",
            reason: specialResolved.error || "collection path resolution failed",
            failedAt: segment,
          };
        }
        value = specialResolved.value;
        continue;
      }
      value = value[segment];
    }

    if (mode === "serializeValue") {
      const serialize = makeSerializer({
        maxSerializeCalls: serializeLimit,
        maxDepth: 2,
        maxArrayLength: 100,
        maxObjectKeys: 100,
        maxMapEntries: 80,
        maxSetEntries: 80,
      });
      return {
        ok: true,
        value: serialize(value),
      };
    }

    if (typeof value !== "function") {
      return { ok: false, error: "선택 값이 함수가 아닙니다.", valueType: typeof value };
    }

    const inspectRefKey = registerFunctionForInspect(value);
    return { ok: true, name: value.name || "(anonymous)", inspectRefKey };
  } catch (e) {
    return { ok: false, error: String(e && e.message) };
  }
}

/** 페이지/런타임 데이터를 조회 */
function fetchTargetData(args: AnyRecord | null | undefined) {
  const targetPath = typeof args?.targetPath === "string" ? args.targetPath : "";
  const methods = Array.isArray(args?.methods) ? args.methods : [];
  const autoDiscoverZeroArgMethods = args?.autoDiscoverZeroArgMethods === true;

  try {
    if (!targetPath) {
      return { error: "대상 경로가 비어 있습니다." };
    }

    const parts = targetPath.replace(/^window\./, "").split(".").filter(Boolean);
    let obj = window;
    for (let i = 0; i < parts.length; i += 1) {
      if (obj == null) break;
      obj = obj[parts[i]];
    }

    if (obj == null) {
      return { error: "객체를 찾을 수 없습니다: " + targetPath };
    }

    let methodList = methods.slice();
    if (methodList.length === 0) {
      if (!autoDiscoverZeroArgMethods) {
        return {
          error: "호출할 메서드가 설정되지 않았습니다. src/config.ts에서 methods를 지정하거나 autoDiscoverZeroArgMethods를 true로 설정하세요.",
          targetPath,
          availableMethods: Object.keys(obj).filter((k) => typeof obj[k] === "function"),
        };
      }
      methodList = Object.keys(obj).filter((k) => typeof obj[k] === "function" && obj[k].length === 0);
    }

    const results = {};
    for (let i = 0; i < methodList.length; i += 1) {
      const name = methodList[i];
      try {
        if (typeof obj[name] !== "function") {
          results[name] = { _skip: "not a function" };
          continue;
        }
        results[name] = obj[name].call(obj);
      } catch (e) {
        results[name] = { _error: String(e && e.message) };
      }
    }

    return { targetPath, results };
  } catch (e) {
    return { error: String(e && e.message) };
  }
}

/** 요청된 메서드를 실행 */
function executeMethod(method: string, args: unknown) {
  switch (method) {
    case "ping":
      return { ok: true };
    case "fetchTargetData":
      return fetchTargetData(args);
    case "getDomTree":
      return domHandlers.getDomTree(args);
    case "highlightComponent":
      return domHandlers.highlightComponent(args);
    case "clearComponentHighlight":
      return domHandlers.clearComponentHighlight();
    case "previewComponent":
      return domHandlers.previewComponent(args);
    case "clearHoverPreview":
      return domHandlers.clearHoverPreview();
    case "reactInspect":
      return inspectReactComponents(args);
    case "reactInspectPath":
      return inspectReactPath(args);
    default:
      return { ok: false, error: "알 수 없는 메서드입니다: " + String(method) };
  }
}

/** 브리지 응답/메시지를 전송 */
function postBridgeResponse(requestId: string, ok: boolean, payload: AnyRecord) {
  window.postMessage(
    {
      source: BRIDGE_SOURCE,
      action: BRIDGE_ACTION_RESPONSE,
      requestId,
      ok,
      ...payload,
    },
    "*"
  );
}

/** 이벤트를 처리 */
function onBridgeMessage(event: MessageEvent) {
  if (event.source !== window) return;
  const data = event.data;
  if (!data || typeof data !== "object") return;
  if (data.source !== BRIDGE_SOURCE || data.action !== BRIDGE_ACTION_REQUEST) return;
  if (typeof data.requestId !== "string" || !data.requestId) return;

  try {
    const result = executeMethod(data.method, data.args);
    postBridgeResponse(data.requestId, true, { result });
  } catch (error) {
    postBridgeResponse(data.requestId, false, {
      error: String(error && error.message ? error.message : error),
    });
  }
}

window.addEventListener("message", onBridgeMessage);
}
