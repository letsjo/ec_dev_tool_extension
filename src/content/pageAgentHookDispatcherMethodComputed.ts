import type { AnyRecord } from "./pageAgentHookDispatcherTypes";
import type { CreateHookInspectDispatcherMethodsOptions } from "./pageAgentHookDispatcherMethodTypes";

function createComputedMethods(options: CreateHookInspectDispatcherMethodsOptions): AnyRecord {
  return {
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

export { createComputedMethods };
