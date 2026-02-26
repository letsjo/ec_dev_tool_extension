// @ts-nocheck
import { createHookInspectDispatcher } from './pageAgentHookDispatcher';
import { buildPrimitiveStackCacheForHookInspect } from './pageAgentHookPrimitiveStack';

interface CreateHookInspectContextOptions {
  initialHookState: unknown;
}

/** hook inspect dispatcher/state를 초기화하고 primitive warmup stack cache를 구성한다. */
function createHookInspectContext(options: CreateHookInspectContextOptions) {
  const inspectState = {
    currentHook: options.initialHookState,
    suspendedToken: null,
    hookLog: [],
  };

  const { dispatcher, dispatcherProxy } = createHookInspectDispatcher(inspectState);

  const primitiveStackCache = buildPrimitiveStackCacheForHookInspect({
    hookLog: inspectState.hookLog,
    dispatcher,
    getCurrentHook() {
      return inspectState.currentHook;
    },
    setCurrentHook(value: unknown) {
      inspectState.currentHook = value;
    },
    getSuspendedToken() {
      return inspectState.suspendedToken;
    },
    setSuspendedToken(value: unknown) {
      inspectState.suspendedToken = value;
    },
  });

  return {
    inspectState,
    dispatcherProxy,
    primitiveStackCache,
  };
}

export { createHookInspectContext };
