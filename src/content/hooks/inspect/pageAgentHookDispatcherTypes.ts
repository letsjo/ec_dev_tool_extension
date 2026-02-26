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

export type { AnyRecord, HookInspectState, HookLogEntry };
