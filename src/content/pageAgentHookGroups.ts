// @ts-nocheck
import {
  parseHookDisplayName,
} from "./pageAgentHookStack";
import {
  getDispatcherRefFromGlobalHook,
  resolveDefaultPropsForHookInspect,
  resolveRenderFunctionForHookInspect,
} from "./pageAgentHookRuntime";
import { alignHookInspectMetadataResultLength } from "./pageAgentHookResult";
import { buildHookInspectMetadataFromLog } from "./pageAgentHookMetadataBuild";
import { buildPrimitiveStackCacheForHookInspect } from "./pageAgentHookPrimitiveStack";

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

  const primitiveStackCache = buildPrimitiveStackCacheForHookInspect({
    hookLog,
    dispatcher,
    getCurrentHook() {
      return currentHook;
    },
    setCurrentHook(value: unknown) {
      currentHook = value;
    },
    getSuspendedToken() {
      return suspendedToken;
    },
    setSuspendedToken(value: unknown) {
      suspendedToken = value;
    },
  });

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
  const result = buildHookInspectMetadataFromLog(
    hookLog,
    rootStackError,
    componentName,
    primitiveStackCache,
  );
  return alignHookInspectMetadataResultLength(result, expectedCount);
}

export { parseHookDisplayName, inspectCustomHookGroupNames };
