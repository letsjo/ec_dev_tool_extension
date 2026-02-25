import { parseHookDisplayName } from "./pageAgentHookStack";

type AnyRecord = Record<string, any>;

type HookLogEntry = {
  primitive: string;
  dispatcherHookName: string;
  value: unknown;
  stackError: Error;
};

interface HookInspectState {
  currentHook: any;
  suspendedToken: unknown;
  hookLog: HookLogEntry[];
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

/** hook inspect render 중 dispatcher 호출 로그를 수집하는 대체 dispatcher를 생성한다. */
function createHookInspectDispatcher(state: HookInspectState) {
  function nextHook() {
    const hook = state.currentHook;
    if (hook && typeof hook === "object" && "next" in hook) {
      state.currentHook = hook.next;
    } else {
      state.currentHook = null;
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
    if (state.hookLog.length >= 220) return;
    state.hookLog.push({
      primitive,
      dispatcherHookName,
      value,
      stackError: new Error(),
    });
  }

  const dispatcher: AnyRecord = {
    readContext(context: AnyRecord | null | undefined) {
      const snapshot = readContextSnapshot(context);
      pushHookLog("Context", "Context", snapshot.value);
      return snapshot.value;
    },
    useContext(context: AnyRecord | null | undefined) {
      const snapshot = readContextSnapshot(context);
      pushHookLog("Context", "Context", snapshot.value);
      return snapshot.value;
    },
    useState(initialState: unknown) {
      const hook = nextHook();
      const stateValue = hook && hook.memoizedState !== undefined
        ? hook.memoizedState
        : (typeof initialState === "function" ? initialState() : initialState);
      pushHookLog("State", "State", stateValue);
      return [stateValue, function() {}];
    },
    useReducer(reducer: unknown, initialArg: unknown, init: unknown) {
      const hook = nextHook();
      let stateValue;
      if (hook && hook.memoizedState !== undefined) {
        stateValue = hook.memoizedState;
      } else if (typeof init === "function") {
        stateValue = init(initialArg);
      } else {
        stateValue = initialArg;
      }
      pushHookLog("Reducer", "Reducer", stateValue);
      return [stateValue, function() {}];
    },
    useRef(initialValue: unknown) {
      const hook = nextHook();
      const value = hook && hook.memoizedState !== undefined ? hook.memoizedState : { current: initialValue };
      pushHookLog("Ref", "Ref", value);
      return value;
    },
    useEffect(create: unknown) {
      readHookMemoizedState();
      pushHookLog("Effect", "Effect", typeof create === "function" ? create : null);
    },
    useLayoutEffect(create: unknown) {
      readHookMemoizedState();
      pushHookLog("LayoutEffect", "LayoutEffect", typeof create === "function" ? create : null);
    },
    useInsertionEffect(create: unknown) {
      readHookMemoizedState();
      pushHookLog("InsertionEffect", "InsertionEffect", typeof create === "function" ? create : null);
    },
    useImperativeHandle(ref: unknown, create: unknown) {
      readHookMemoizedState();
      pushHookLog("ImperativeHandle", "ImperativeHandle", typeof create === "function" ? create : null);
    },
    useDebugValue(value: unknown) {
      pushHookLog("DebugValue", "DebugValue", value);
    },
    useCallback(callback: unknown) {
      const stateValue = readHookMemoizedState();
      const value = Array.isArray(stateValue) ? stateValue[0] : callback;
      pushHookLog("Callback", "Callback", value);
      return value;
    },
    useMemo(create: unknown) {
      const stateValue = readHookMemoizedState();
      const value = Array.isArray(stateValue) ? stateValue[0] : undefined;
      pushHookLog("Memo", "Memo", value);
      return value;
    },
    useDeferredValue(value: unknown) {
      const stateValue = readHookMemoizedState();
      const nextValue = stateValue !== undefined ? stateValue : value;
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
    useSyncExternalStore(subscribe: unknown, getSnapshot: unknown) {
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
    useOptimistic(passthrough: unknown) {
      const stateValue = readHookMemoizedState();
      const nextState = stateValue !== undefined ? stateValue : passthrough;
      pushHookLog("Optimistic", "Optimistic", nextState);
      return [nextState, function() {}];
    },
    useFormState(action: unknown, initialState: unknown) {
      const stateValue = readHookMemoizedState();
      const nextState = stateValue !== undefined ? stateValue : initialState;
      pushHookLog("FormState", "FormState", nextState);
      return [nextState, function() {}];
    },
    useActionState(action: unknown, initialState: unknown) {
      const stateValue = readHookMemoizedState();
      const nextState = stateValue !== undefined ? stateValue : initialState;
      pushHookLog("ActionState", "ActionState", nextState);
      return [nextState, function() {}, false];
    },
    useHostTransitionStatus() {
      const status = readHookMemoizedState();
      pushHookLog("HostTransitionStatus", "HostTransitionStatus", status);
      return status;
    },
    useEffectEvent(callback: unknown) {
      readHookMemoizedState();
      pushHookLog("EffectEvent", "EffectEvent", callback);
      return typeof callback === "function" ? callback : function() {};
    },
    useMemoCache(size: number) {
      readHookMemoizedState();
      pushHookLog("MemoCache", "MemoCache", size);
      const cache = [];
      for (let i = 0; i < size; i += 1) cache.push(undefined);
      return cache;
    },
    use(usable: unknown) {
      const stateValue = readHookMemoizedState();
      if (usable && typeof usable === "object" && typeof (usable as AnyRecord).then === "function") {
        if (stateValue !== undefined) {
          pushHookLog("Promise", "Use", stateValue);
          return stateValue;
        }
        pushHookLog("Unresolved", "Use", usable);
        if (state.suspendedToken === null) {
          state.suspendedToken = {};
        }
        throw state.suspendedToken;
      }
      const contextSnapshot = readContextSnapshot(usable as AnyRecord);
      if (contextSnapshot.hasValue) {
        pushHookLog("Context", "Use", contextSnapshot.value);
        return contextSnapshot.value;
      }
      const fallbackValue = stateValue !== undefined ? stateValue : usable;
      pushHookLog("Use", "Use", fallbackValue);
      return fallbackValue;
    },
  };

  const dispatcherProxy = typeof Proxy === "function"
    ? new Proxy(dispatcher, {
      get(target, prop) {
        if (prop in target) return target[prop as string];
        if (typeof prop !== "string") return undefined;
        return function genericHookFallback(arg: unknown) {
          const stateValue = readHookMemoizedState();
          const inferred = parseHookDisplayName(prop) || "Hook";
          const value = stateValue !== undefined ? stateValue : arg;
          pushHookLog(inferred, inferred, value);
          return value;
        };
      },
    })
    : dispatcher;

  return {
    dispatcher,
    dispatcherProxy,
  };
}

export { createHookInspectDispatcher };
export type { HookInspectState, HookLogEntry };
