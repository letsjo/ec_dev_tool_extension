// @ts-nocheck
import { resolveDefaultPropsForHookInspect } from './pageAgentHookRuntime';
import { runHookInspectRender } from './pageAgentHookRenderExecution';

interface RunHookInspectPassOptions {
  dispatcherRef: Record<string, unknown>;
  previousDispatcher: unknown;
  dispatcherProxy: unknown;
  fiber: unknown;
  renderFn: (...args: unknown[]) => unknown;
  getSuspendedToken: () => unknown;
}

/** hook inspect dispatcher를 적용해 component render를 1회 실행한다. */
function runHookInspectPass(options: RunHookInspectPassOptions) {
  return runHookInspectRender({
    dispatcherRef: options.dispatcherRef,
    previousDispatcher: options.previousDispatcher,
    dispatcherProxy: options.dispatcherProxy,
    fiber: options.fiber,
    renderFn: options.renderFn,
    getSuspendedToken: options.getSuspendedToken,
    resolveDefaultProps: resolveDefaultPropsForHookInspect,
  });
}

export { runHookInspectPass };
