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

export type { CreateHookInspectDispatcherMethodsOptions };
