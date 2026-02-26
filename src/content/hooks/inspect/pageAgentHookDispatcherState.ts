import type { AnyRecord, HookInspectState } from "./pageAgentHookDispatcherTypes";

/** context 객체에서 현재 값 스냅샷을 읽는다. */
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

/** hook linked-list cursor 전진과 hook log push 유틸을 만든다. */
function createHookInspectStateHelpers(state: HookInspectState) {
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

  return {
    nextHook,
    readHookMemoizedState,
    pushHookLog,
  };
}

export { createHookInspectStateHelpers, readContextSnapshot };
