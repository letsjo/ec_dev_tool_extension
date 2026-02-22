/**
 * Main world runtime hook:
 * React commit 이벤트(onCommitFiberRoot)를 감지해 content script로 postMessage 전달.
 */

const MESSAGE_SOURCE = "EC_DEV_TOOL_REACT_RUNTIME_HOOK";
const MESSAGE_ACTION = "reactCommit";
const STATE_KEY = "__EC_DEV_TOOL_REACT_RUNTIME_HOOK_STATE__";
const WRAPPED_KEY = "__EC_DEV_TOOL_REACT_RUNTIME_HOOK_WRAPPED__";

const POST_MIN_INTERVAL_MS = 400;
const HOOK_ATTACH_INTERVAL_MS = 2000;

type HookMethod = (...args: unknown[]) => unknown;

type HookLike = {
  supportsFiber?: boolean;
  renderers?: Map<number, unknown>;
  inject?: (internals: unknown) => number;
  onCommitFiberRoot?: HookMethod;
  onPostCommitFiberRoot?: HookMethod;
  onCommitFiberUnmount?: HookMethod;
  checkDCE?: HookMethod;
  [key: string]: unknown;
};

type RuntimeWindow = Window & {
  __REACT_DEVTOOLS_GLOBAL_HOOK__?: unknown;
  [STATE_KEY]?: {
    installed: boolean;
    fallbackTimer: number | null;
    lastPostedAt: number;
  };
};

const runtimeWindow = window as RuntimeWindow;

/** 필요한 값/상태를 계산해 반환 */
function getState() {
  return runtimeWindow[STATE_KEY];
}

/** 브리지 응답/메시지를 전송 */
function postCommit(reason: string, force = false) {
  const state = getState();
  if (!state) return;

  const now = Date.now();
  if (!force && now - state.lastPostedAt < POST_MIN_INTERVAL_MS) return;

  state.lastPostedAt = now;
  runtimeWindow.postMessage(
    {
      source: MESSAGE_SOURCE,
      action: MESSAGE_ACTION,
      reason,
      timestamp: now,
    },
    "*"
  );
}

/** 해당 기능 흐름을 처리 */
function wrapHookMethod(hook: HookLike, methodName: "onCommitFiberRoot" | "onPostCommitFiberRoot"): boolean {
  const original = hook[methodName];
  if (typeof original !== "function") return false;

  const originalFn = original as HookMethod & { [WRAPPED_KEY]?: boolean };
  if (originalFn[WRAPPED_KEY]) return true;

  const wrapped: HookMethod & { [WRAPPED_KEY]?: boolean } = function wrappedCommit(this: unknown, ...args: unknown[]) {
    try {
      return originalFn.apply(this, args);
    } finally {
      postCommit(methodName);
    }
  };

  wrapped[WRAPPED_KEY] = true;
  hook[methodName] = wrapped;
  return true;
}

/** 해당 기능 흐름을 처리 */
function attachHook(candidate: unknown): boolean {
  if (!candidate || typeof candidate !== "object") return false;
  const hook = candidate as HookLike;

  const commitWrapped = wrapHookMethod(hook, "onCommitFiberRoot");
  const postCommitWrapped = wrapHookMethod(hook, "onPostCommitFiberRoot");
  return commitWrapped || postCommitWrapped;
}

/** 렌더링에 사용할 DOM/데이터 구조를 생성 */
function createFallbackHook(): HookLike {
  const renderers = new Map<number, unknown>();
  let nextRendererId = 0;
  return {
    supportsFiber: true,
    renderers,
    inject(internals: unknown) {
      nextRendererId += 1;
      renderers.set(nextRendererId, internals);
      postCommit("inject", true);
      return nextRendererId;
    },
    onCommitFiberRoot() {
      // wrapped by attachHook
    },
    onPostCommitFiberRoot() {
      // wrapped by attachHook
    },
    onCommitFiberUnmount() {
      // not used
    },
    checkDCE() {
      // React internal dead code elimination check hook
    },
  };
}

/** 필수 상태를 보장 */
function ensureHookObject() {
  if (runtimeWindow.__REACT_DEVTOOLS_GLOBAL_HOOK__ && typeof runtimeWindow.__REACT_DEVTOOLS_GLOBAL_HOOK__ === "object") {
    return;
  }
  runtimeWindow.__REACT_DEVTOOLS_GLOBAL_HOOK__ = createFallbackHook();
}

/** 해당 기능 흐름을 처리 */
function installHookSetterInterceptor() {
  const descriptor = Object.getOwnPropertyDescriptor(runtimeWindow, "__REACT_DEVTOOLS_GLOBAL_HOOK__");
  if (descriptor && !descriptor.configurable) return;

  let fallbackValue = runtimeWindow.__REACT_DEVTOOLS_GLOBAL_HOOK__;
  Object.defineProperty(runtimeWindow, "__REACT_DEVTOOLS_GLOBAL_HOOK__", {
    configurable: true,
    enumerable: descriptor?.enumerable ?? true,
    get() {
      if (descriptor?.get) {
        return descriptor.get.call(runtimeWindow);
      }
      return fallbackValue;
    },
    set(nextValue: unknown) {
      if (descriptor?.set) {
        descriptor.set.call(runtimeWindow, nextValue);
      } else {
        fallbackValue = nextValue;
      }
      const currentValue = descriptor?.get ? descriptor.get.call(runtimeWindow) : fallbackValue;
      if (attachHook(currentValue)) {
        postCommit("hook-set", true);
      }
    },
  });
}

/** 해당 기능 흐름을 처리 */
function installRuntimeHook() {
  const existing = getState();
  if (existing?.installed) return;

  runtimeWindow[STATE_KEY] = {
    installed: true,
    fallbackTimer: null,
    lastPostedAt: 0,
  };

  ensureHookObject();
  attachHook(runtimeWindow.__REACT_DEVTOOLS_GLOBAL_HOOK__);
  installHookSetterInterceptor();

  const state = getState();
  if (state) {
    state.fallbackTimer = runtimeWindow.setInterval(() => {
      attachHook(runtimeWindow.__REACT_DEVTOOLS_GLOBAL_HOOK__);
    }, HOOK_ATTACH_INTERVAL_MS);
  }

  runtimeWindow.addEventListener(
    "beforeunload",
    () => {
      const currentState = getState();
      if (!currentState) return;
      if (currentState.fallbackTimer !== null) {
        runtimeWindow.clearInterval(currentState.fallbackTimer);
        currentState.fallbackTimer = null;
      }
    },
    { once: true }
  );

  postCommit("hook-installed", true);
}

installRuntimeHook();
