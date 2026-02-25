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
import {
  inspectCustomHookGroupNames,
  parseHookDisplayName,
} from "./pageAgentHookGroups";
import { createPageAgentInspectHandlers } from "./pageAgentInspect";

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
    const customMetadata = inspectCustomHookGroupNames(fiber, null, getFiberName);
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
