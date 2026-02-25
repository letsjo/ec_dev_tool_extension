// @ts-nocheck
import {
  isLikelyCustomHookFrame,
  parseErrorStackFrames,
  parseHookDisplayName,
} from "./pageAgentHookStack";
import type { StackFrame } from "./pageAgentHookStack";

type AnyRecord = Record<string, any>;
type PathSegment = string | number;
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
function inspectCustomHookGroupNames(
  fiber: FiberLike | null | undefined,
  expectedCount: number | null | undefined,
  getFiberName: (fiber: FiberLike) => string,
) {
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

export { parseHookDisplayName, inspectCustomHookGroupNames };
