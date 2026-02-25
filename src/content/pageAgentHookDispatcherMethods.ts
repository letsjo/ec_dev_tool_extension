import type { AnyRecord, HookInspectState } from "./pageAgentHookDispatcherTypes";

interface CreateHookInspectDispatcherMethodsOptions {
  state: HookInspectState;
  nextHook: () => any;
  readHookMemoizedState: () => unknown;
  pushHookLog: (primitive: string, dispatcherHookName: string, value: unknown) => void;
  readContextSnapshot: (
    context: AnyRecord | null | undefined,
  ) => { hasValue: boolean; value: unknown };
}

/** hook inspect 대체 dispatcher의 built-in hook 메서드 집합을 만든다. */
function createHookInspectDispatcherMethods(
  options: CreateHookInspectDispatcherMethodsOptions,
): AnyRecord {
  return {
    readContext(context: AnyRecord | null | undefined) {
      const snapshot = options.readContextSnapshot(context);
      options.pushHookLog("Context", "Context", snapshot.value);
      return snapshot.value;
    },
    useContext(context: AnyRecord | null | undefined) {
      const snapshot = options.readContextSnapshot(context);
      options.pushHookLog("Context", "Context", snapshot.value);
      return snapshot.value;
    },
    useState(initialState: unknown) {
      const hook = options.nextHook();
      const stateValue =
        hook && hook.memoizedState !== undefined
          ? hook.memoizedState
          : typeof initialState === "function"
            ? initialState()
            : initialState;
      options.pushHookLog("State", "State", stateValue);
      return [stateValue, function() {}];
    },
    useReducer(reducer: unknown, initialArg: unknown, init: unknown) {
      const hook = options.nextHook();
      let stateValue;
      if (hook && hook.memoizedState !== undefined) {
        stateValue = hook.memoizedState;
      } else if (typeof init === "function") {
        stateValue = init(initialArg);
      } else {
        stateValue = initialArg;
      }
      options.pushHookLog("Reducer", "Reducer", stateValue);
      return [stateValue, function() {}];
    },
    useRef(initialValue: unknown) {
      const hook = options.nextHook();
      const value =
        hook && hook.memoizedState !== undefined ? hook.memoizedState : { current: initialValue };
      options.pushHookLog("Ref", "Ref", value);
      return value;
    },
    useEffect(create: unknown) {
      options.readHookMemoizedState();
      options.pushHookLog("Effect", "Effect", typeof create === "function" ? create : null);
    },
    useLayoutEffect(create: unknown) {
      options.readHookMemoizedState();
      options.pushHookLog(
        "LayoutEffect",
        "LayoutEffect",
        typeof create === "function" ? create : null,
      );
    },
    useInsertionEffect(create: unknown) {
      options.readHookMemoizedState();
      options.pushHookLog(
        "InsertionEffect",
        "InsertionEffect",
        typeof create === "function" ? create : null,
      );
    },
    useImperativeHandle(ref: unknown, create: unknown) {
      options.readHookMemoizedState();
      options.pushHookLog(
        "ImperativeHandle",
        "ImperativeHandle",
        typeof create === "function" ? create : null,
      );
    },
    useDebugValue(value: unknown) {
      options.pushHookLog("DebugValue", "DebugValue", value);
    },
    useCallback(callback: unknown) {
      const stateValue = options.readHookMemoizedState();
      const value = Array.isArray(stateValue) ? stateValue[0] : callback;
      options.pushHookLog("Callback", "Callback", value);
      return value;
    },
    useMemo(create: unknown) {
      const stateValue = options.readHookMemoizedState();
      const value = Array.isArray(stateValue) ? stateValue[0] : undefined;
      options.pushHookLog("Memo", "Memo", value);
      return value;
    },
    useDeferredValue(value: unknown) {
      const stateValue = options.readHookMemoizedState();
      const nextValue = stateValue !== undefined ? stateValue : value;
      options.pushHookLog("DeferredValue", "DeferredValue", nextValue);
      return nextValue;
    },
    useTransition() {
      const stateHook = options.nextHook();
      options.nextHook();
      const pending = !!(stateHook && stateHook.memoizedState);
      options.pushHookLog("Transition", "Transition", pending);
      return [pending, function() {}];
    },
    useSyncExternalStore(subscribe: unknown, getSnapshot: unknown) {
      const hook = options.nextHook();
      options.nextHook();
      options.nextHook();
      const value =
        hook && hook.memoizedState !== undefined
          ? hook.memoizedState
          : typeof getSnapshot === "function"
            ? getSnapshot()
            : undefined;
      options.pushHookLog("SyncExternalStore", "SyncExternalStore", value);
      return value;
    },
    useId() {
      const id = options.readHookMemoizedState();
      const nextId = typeof id === "string" ? id : "";
      options.pushHookLog("Id", "Id", nextId);
      return nextId;
    },
    useOptimistic(passthrough: unknown) {
      const stateValue = options.readHookMemoizedState();
      const nextState = stateValue !== undefined ? stateValue : passthrough;
      options.pushHookLog("Optimistic", "Optimistic", nextState);
      return [nextState, function() {}];
    },
    useFormState(action: unknown, initialState: unknown) {
      const stateValue = options.readHookMemoizedState();
      const nextState = stateValue !== undefined ? stateValue : initialState;
      options.pushHookLog("FormState", "FormState", nextState);
      return [nextState, function() {}];
    },
    useActionState(action: unknown, initialState: unknown) {
      const stateValue = options.readHookMemoizedState();
      const nextState = stateValue !== undefined ? stateValue : initialState;
      options.pushHookLog("ActionState", "ActionState", nextState);
      return [nextState, function() {}, false];
    },
    useHostTransitionStatus() {
      const status = options.readHookMemoizedState();
      options.pushHookLog("HostTransitionStatus", "HostTransitionStatus", status);
      return status;
    },
    useEffectEvent(callback: unknown) {
      options.readHookMemoizedState();
      options.pushHookLog("EffectEvent", "EffectEvent", callback);
      return typeof callback === "function" ? callback : function() {};
    },
    useMemoCache(size: number) {
      options.readHookMemoizedState();
      options.pushHookLog("MemoCache", "MemoCache", size);
      const cache = [];
      for (let i = 0; i < size; i += 1) cache.push(undefined);
      return cache;
    },
    use(usable: unknown) {
      const stateValue = options.readHookMemoizedState();
      if (usable && typeof usable === "object" && typeof (usable as AnyRecord).then === "function") {
        if (stateValue !== undefined) {
          options.pushHookLog("Promise", "Use", stateValue);
          return stateValue;
        }
        options.pushHookLog("Unresolved", "Use", usable);
        if (options.state.suspendedToken === null) {
          options.state.suspendedToken = {};
        }
        throw options.state.suspendedToken;
      }
      const contextSnapshot = options.readContextSnapshot(usable as AnyRecord);
      if (contextSnapshot.hasValue) {
        options.pushHookLog("Context", "Use", contextSnapshot.value);
        return contextSnapshot.value;
      }
      const fallbackValue = stateValue !== undefined ? stateValue : usable;
      options.pushHookLog("Use", "Use", fallbackValue);
      return fallbackValue;
    },
  };
}

export { createHookInspectDispatcherMethods };
