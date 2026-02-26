import { resolveDefaultPropsForHookInspect } from './pageAgentHookRuntime';
import { runHookInspectRender } from './pageAgentHookRenderExecution';

type HookInspectRenderArgs = Parameters<typeof runHookInspectRender>[0];

type RunHookInspectPassOptions = Omit<HookInspectRenderArgs, 'resolveDefaultProps'>;

/** hook inspect dispatcher를 적용해 component render를 1회 실행한다. */
function runHookInspectPass(options: RunHookInspectPassOptions): Error | null {
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
