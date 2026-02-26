interface HookLike {
  supportsFiber?: boolean;
  renderers?: Map<number, unknown>;
  inject?: (internals: unknown) => number;
  onCommitFiberRoot?: (...args: unknown[]) => unknown;
  onPostCommitFiberRoot?: (...args: unknown[]) => unknown;
  onCommitFiberUnmount?: (...args: unknown[]) => unknown;
  checkDCE?: (...args: unknown[]) => unknown;
  [key: string]: unknown;
}

type RuntimeWindow = Window & {
  __REACT_DEVTOOLS_GLOBAL_HOOK__?: unknown;
};

interface RuntimeHookInstallOptions {
  messageSource: string;
  messageAction: string;
  stateKey: string;
  wrappedKey: string;
  postMinIntervalMs: number;
  hookAttachIntervalMs: number;
  now: () => number;
}

interface RuntimeHookState {
  installed: boolean;
  fallbackTimer: number | null;
  lastPostedAt: number;
}

/** window global hook에 commit 감지 래퍼를 설치한다. */
function installRuntimeHook(
  runtimeWindow: RuntimeWindow,
  options: RuntimeHookInstallOptions,
) {
  const runtimeStore = runtimeWindow as unknown as Record<string, unknown>;

  function getState(): RuntimeHookState | null {
    const state = runtimeStore[options.stateKey] as RuntimeHookState | null | undefined;
    return state ?? null;
  }

  function setState(nextState: RuntimeHookState) {
    runtimeStore[options.stateKey] = nextState;
  }

  function postCommit(reason: string, force = false) {
    const state = getState();
    if (!state) return;

    const timestamp = options.now();
    if (!force && timestamp - state.lastPostedAt < options.postMinIntervalMs) return;

    state.lastPostedAt = timestamp;
    runtimeWindow.postMessage(
      {
        source: options.messageSource,
        action: options.messageAction,
        reason,
        timestamp,
      },
      "*",
    );
  }

  function wrapHookMethod(
    hook: HookLike,
    methodName: "onCommitFiberRoot" | "onPostCommitFiberRoot",
  ): boolean {
    const original = hook[methodName];
    if (typeof original !== "function") return false;

    const originalFn = original as ((...args: unknown[]) => unknown) & {
      [key: string]: boolean | undefined;
    };

    if (originalFn[options.wrappedKey]) return true;

    const wrapped = function wrappedCommit(this: unknown, ...args: unknown[]) {
      try {
        return originalFn.apply(this, args);
      } finally {
        postCommit(methodName);
      }
    } as ((...args: unknown[]) => unknown) & { [key: string]: boolean | undefined };

    wrapped[options.wrappedKey] = true;
    hook[methodName] = wrapped;
    return true;
  }

  function attachHook(candidate: unknown): boolean {
    if (!candidate || typeof candidate !== "object") return false;
    const hook = candidate as HookLike;
    const commitWrapped = wrapHookMethod(hook, "onCommitFiberRoot");
    const postCommitWrapped = wrapHookMethod(hook, "onPostCommitFiberRoot");
    return commitWrapped || postCommitWrapped;
  }

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

  function ensureHookObject() {
    if (
      runtimeWindow.__REACT_DEVTOOLS_GLOBAL_HOOK__ &&
      typeof runtimeWindow.__REACT_DEVTOOLS_GLOBAL_HOOK__ === "object"
    ) {
      return;
    }
    runtimeWindow.__REACT_DEVTOOLS_GLOBAL_HOOK__ = createFallbackHook();
  }

  function installHookSetterInterceptor() {
    const descriptor = Object.getOwnPropertyDescriptor(
      runtimeWindow,
      "__REACT_DEVTOOLS_GLOBAL_HOOK__",
    );
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
        const currentValue = descriptor?.get
          ? descriptor.get.call(runtimeWindow)
          : fallbackValue;
        if (attachHook(currentValue)) {
          postCommit("hook-set", true);
        }
      },
    });
  }

  const existing = getState();
  if (existing?.installed) return;

  setState({
    installed: true,
    fallbackTimer: null,
    lastPostedAt: 0,
  });

  ensureHookObject();
  attachHook(runtimeWindow.__REACT_DEVTOOLS_GLOBAL_HOOK__);
  installHookSetterInterceptor();

  const state = getState();
  if (state) {
    state.fallbackTimer = runtimeWindow.setInterval(() => {
      attachHook(runtimeWindow.__REACT_DEVTOOLS_GLOBAL_HOOK__);
    }, options.hookAttachIntervalMs);
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
    { once: true },
  );

  postCommit("hook-installed", true);
}

export { installRuntimeHook };
export type { RuntimeHookInstallOptions };
