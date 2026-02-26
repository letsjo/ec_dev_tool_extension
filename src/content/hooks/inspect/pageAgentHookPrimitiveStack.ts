import { parseErrorStackFrames } from "../pageAgentHookStack";
import type { StackFrame } from "../pageAgentHookStack";

type HookLogEntry = {
  primitive?: string | null;
  stackError?: Error;
};

interface PrimitiveStackCacheBuildArgs {
  hookLog: HookLogEntry[];
  dispatcher: Record<string, (...args: any[]) => unknown>;
  getCurrentHook: () => unknown;
  setCurrentHook: (value: unknown) => void;
  getSuspendedToken: () => unknown;
  setSuspendedToken: (value: unknown) => void;
}

/** warmup 실행 중 발생하는 예외(use suspend 등)를 무시하고 진행한다. */
function callWarmup(fn: () => unknown) {
  try {
    fn();
  } catch (_) {
    /** warmup 중 부수효과(unresolved use 등)는 무시한다. */
  }
}

/** dispatcher warmup 로그를 primitive별 stack frame 캐시로 변환한다. */
function buildPrimitiveStackCacheForHookInspect(
  args: PrimitiveStackCacheBuildArgs,
): Map<string, StackFrame[]> {
  const {
    hookLog,
    dispatcher,
    getCurrentHook,
    setCurrentHook,
    getSuspendedToken,
    setSuspendedToken,
  } = args;
  const cache = new Map<string, StackFrame[]>();
  const warmupStartIndex = hookLog.length;
  const savedCurrentHook = getCurrentHook();
  const savedSuspendedToken = getSuspendedToken();
  setCurrentHook(null);
  setSuspendedToken(null);

  try {
    callWarmup(() => dispatcher.useContext({ _currentValue: null }));
    callWarmup(() => dispatcher.useState(null));
    callWarmup(() => dispatcher.useReducer((s: unknown) => s, null));
    callWarmup(() => dispatcher.useRef(null));
    callWarmup(() => dispatcher.useLayoutEffect(function() {}));
    callWarmup(() => dispatcher.useInsertionEffect(function() {}));
    callWarmup(() => dispatcher.useEffect(function() {}));
    callWarmup(() => dispatcher.useImperativeHandle(null, function() { return null; }));
    callWarmup(() => dispatcher.useDebugValue(null));
    callWarmup(() => dispatcher.useCallback(function() {}));
    callWarmup(() => dispatcher.useTransition());
    callWarmup(() => dispatcher.useSyncExternalStore(
      function() { return function() {}; },
      function() { return null; },
    ));
    callWarmup(() => dispatcher.useDeferredValue(null));
    callWarmup(() => dispatcher.useMemo(function() { return null; }));
    callWarmup(() => dispatcher.useOptimistic(null));
    callWarmup(() => dispatcher.useFormState((s: unknown) => s, null));
    callWarmup(() => dispatcher.useActionState((s: unknown) => s, null));
    callWarmup(() => dispatcher.useHostTransitionStatus());
    callWarmup(() => dispatcher.useId());
    callWarmup(() => dispatcher.useEffectEvent(function() {}));
    callWarmup(() => dispatcher.useMemoCache(0));
    callWarmup(() => dispatcher.use({ _currentValue: null }));
    callWarmup(() => dispatcher.use({
      then() {},
      status: "fulfilled",
      value: null,
    }));
    callWarmup(() => dispatcher.use({
      then() {},
    }));
  } finally {
    const warmupEntries = hookLog.splice(warmupStartIndex);
    for (let i = 0; i < warmupEntries.length; i += 1) {
      const entry = warmupEntries[i];
      if (!entry || !entry.primitive || cache.has(entry.primitive)) continue;
      cache.set(entry.primitive, parseErrorStackFrames(entry.stackError));
    }
    setCurrentHook(savedCurrentHook);
    setSuspendedToken(savedSuspendedToken);
  }

  return cache;
}

export { buildPrimitiveStackCacheForHookInspect };
