import { parseHookDisplayName } from "./pageAgentHookStack";
import { createHookInspectDispatcherMethods } from "./pageAgentHookDispatcherMethods";
import {
  createHookInspectStateHelpers,
  readContextSnapshot,
} from "./pageAgentHookDispatcherState";
import type {
  AnyRecord,
  HookInspectState,
  HookLogEntry,
} from "./pageAgentHookDispatcherTypes";

/** hook inspect render 중 dispatcher 호출 로그를 수집하는 대체 dispatcher를 생성한다. */
function createHookInspectDispatcher(state: HookInspectState) {
  const { nextHook, readHookMemoizedState, pushHookLog } =
    createHookInspectStateHelpers(state);

  const dispatcher = createHookInspectDispatcherMethods({
    state,
    nextHook,
    readHookMemoizedState,
    pushHookLog,
    readContextSnapshot,
  });

  const dispatcherProxy =
    typeof Proxy === "function"
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
export type { AnyRecord, HookInspectState, HookLogEntry };
