import type { AnyRecord } from "./pageAgentHookDispatcherTypes";
import type { CreateHookInspectDispatcherMethodsOptions } from "./pageAgentHookDispatcherMethodTypes";

function createEffectMethods(options: CreateHookInspectDispatcherMethodsOptions): AnyRecord {
  return {
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
  };
}

export { createEffectMethods };
