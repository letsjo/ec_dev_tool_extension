import type { AnyRecord } from "./pageAgentHookDispatcherTypes";
import type { CreateHookInspectDispatcherMethodsOptions } from "./pageAgentHookDispatcherMethodTypes";

function createContextStateMethods(
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
  };
}

export { createContextStateMethods };
