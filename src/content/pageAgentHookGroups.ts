// @ts-nocheck
import {
  getDispatcherRefFromGlobalHook,
  resolveRenderFunctionForHookInspect,
} from './pageAgentHookRuntime';
import { alignHookInspectMetadataResultLength } from './pageAgentHookResult';
import { buildHookInspectMetadataFromLog } from './pageAgentHookMetadataBuild';
import { createHookInspectContext } from './pageAgentHookInspectContext';
import { runHookInspectPass } from './pageAgentHookInspectRender';

type AnyRecord = Record<string, any>;
type FiberLike = AnyRecord & {
  tag?: number;
  type?: any;
  elementType?: any;
  return?: FiberLike | null;
  child?: FiberLike | null;
  sibling?: FiberLike | null;
  alternate?: FiberLike | null;
  stateNode?: any;
  memoizedState?: any;
  memoizedProps?: any;
  ref?: any;
  _debugHookTypes?: unknown[];
};

/** 경로 기준 inspect 동작을 수행 */
function inspectCustomHookGroupNames(
  fiber: FiberLike | null | undefined,
  expectedCount: number | null | undefined,
  getFiberName: (fiber: FiberLike) => string,
) {
  if (!fiber || fiber.tag === 1) return null;

  const renderFn = resolveRenderFunctionForHookInspect(fiber);
  if (typeof renderFn !== 'function') return null;

  const dispatcherRef = getDispatcherRefFromGlobalHook();
  if (!dispatcherRef || typeof dispatcherRef.H === 'undefined') return null;

  const componentName = getFiberName(fiber);
  const previousDispatcher = dispatcherRef.H;

  const { inspectState, dispatcherProxy, primitiveStackCache } = createHookInspectContext({
    initialHookState: fiber.memoizedState,
  });

  const rootStackError = runHookInspectPass({
    dispatcherRef,
    previousDispatcher,
    dispatcherProxy,
    fiber,
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
