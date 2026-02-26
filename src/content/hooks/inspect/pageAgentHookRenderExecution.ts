type AnyRecord = Record<string, any>;

interface FiberLike {
  tag?: number;
  type?: any;
  elementType?: any;
  memoizedProps?: any;
  ref?: any;
}

interface RunHookInspectRenderArgs {
  dispatcherRef: AnyRecord;
  previousDispatcher: unknown;
  dispatcherProxy: unknown;
  fiber: FiberLike;
  renderFn: (...args: any[]) => unknown;
  getSuspendedToken: () => unknown;
  resolveDefaultProps: (type: any, props: any) => any;
}

function muteConsoleMethods() {
  const originalConsoleMethods: AnyRecord = {};
  for (const method in console) {
    try {
      originalConsoleMethods[method] = (console as AnyRecord)[method];
      (console as AnyRecord)[method] = function() {};
    } catch (_) {}
  }
  return originalConsoleMethods;
}

function restoreConsoleMethods(originalConsoleMethods: AnyRecord) {
  for (const method in originalConsoleMethods) {
    try {
      (console as AnyRecord)[method] = originalConsoleMethods[method];
    } catch (_) {}
  }
}

/** dispatcher 교체 상태에서 안전하게 render를 수행하고 root stack error를 수집한다. */
function runHookInspectRender(args: RunHookInspectRenderArgs) {
  const {
    dispatcherRef,
    previousDispatcher,
    dispatcherProxy,
    fiber,
    renderFn,
    getSuspendedToken,
    resolveDefaultProps,
  } = args;
  const originalConsoleMethods = muteConsoleMethods();
  let rootStackError: Error | null = null;

  try {
    dispatcherRef.H = dispatcherProxy;
    rootStackError = new Error();
    let props = fiber.memoizedProps;
    if (fiber.type !== fiber.elementType) {
      props = resolveDefaultProps(fiber.type, props);
    }
    if (fiber.tag === 11 && fiber.type && typeof fiber.type.render === "function") {
      renderFn(props, fiber.ref);
    } else {
      renderFn(props);
    }
  } catch (error) {
    if (getSuspendedToken() && error === getSuspendedToken()) {
      /** unresolved Promise(use) 경로는 정상 흐름으로 간주한다. */
    }
  } finally {
    dispatcherRef.H = previousDispatcher;
    restoreConsoleMethods(originalConsoleMethods);
  }

  return rootStackError;
}

export { runHookInspectRender };
