import { alignHookInspectMetadataResultLength } from './pageAgentHookResult';
import { buildHookInspectMetadataFromLog } from './pageAgentHookMetadataBuild';
import { createHookInspectContext } from './hooks/inspect/pageAgentHookInspectContext';
import { runHookInspectPass } from './hooks/inspect/pageAgentHookInspectRender';
import { resolveHookInspectRuntimeContext } from './pageAgentHookGroupRuntimeContext';
import type { FiberLike } from './pageAgentFiberSearchTypes';

/** 경로 기준 inspect 동작을 수행 */
function inspectCustomHookGroupNames(
  fiber: FiberLike | null | undefined,
  expectedCount: number | null | undefined,
  getFiberName: (fiber: FiberLike) => string,
) {
  const runtimeContext = resolveHookInspectRuntimeContext({
    fiber,
    getFiberName,
  });
  if (!runtimeContext) return null;
  const { fiber: targetFiber, componentName, renderFn, dispatcherRef, previousDispatcher } =
    runtimeContext;

  const { inspectState, dispatcherProxy, primitiveStackCache } = createHookInspectContext({
    initialHookState: targetFiber.memoizedState,
  });

  const rootStackError = runHookInspectPass({
    dispatcherRef,
    previousDispatcher,
    dispatcherProxy,
    fiber: targetFiber,
    renderFn,
    getSuspendedToken() {
      return inspectState.suspendedToken;
    },
  });

  if (inspectState.hookLog.length === 0) return null;

  const result = buildHookInspectMetadataFromLog(
    inspectState.hookLog,
    rootStackError,
    componentName,
    primitiveStackCache,
  );

  return alignHookInspectMetadataResultLength(result, expectedCount);
}

export { inspectCustomHookGroupNames };
