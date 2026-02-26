import type { AnyRecord } from "./pageAgentHookDispatcherTypes";
import { createComputedMethods } from "./pageAgentHookDispatcherMethodComputed";
import { createContextStateMethods } from "./pageAgentHookDispatcherMethodContextState";
import { createEffectMethods } from "./pageAgentHookDispatcherMethodEffects";
import type { CreateHookInspectDispatcherMethodsOptions } from "./pageAgentHookDispatcherMethodTypes";

/** hook inspect 대체 dispatcher의 built-in hook 메서드 집합을 만든다. */
function createHookInspectDispatcherMethods(
  options: CreateHookInspectDispatcherMethodsOptions,
): AnyRecord {
  return {
    ...createContextStateMethods(options),
    ...createEffectMethods(options),
    ...createComputedMethods(options),
  };
}

export { createHookInspectDispatcherMethods };
