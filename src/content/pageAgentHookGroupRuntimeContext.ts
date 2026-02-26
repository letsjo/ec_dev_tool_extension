import { getDispatcherRefFromGlobalHook, resolveRenderFunctionForHookInspect } from './pageAgentHookRuntime';
import type { FiberLike } from './fiber/pageAgentFiberSearchTypes';

interface HookInspectDispatcherRef extends Record<string, unknown> {
  H: unknown;
}

interface HookInspectRuntimeContext {
  fiber: FiberLike;
  componentName: string;
  renderFn: (...args: unknown[]) => unknown;
  dispatcherRef: HookInspectDispatcherRef;
  previousDispatcher: unknown;
}

interface ResolveHookInspectRuntimeContextOptions {
  fiber: FiberLike | null | undefined;
  getFiberName: (fiber: FiberLike) => string;
}

/** hook group inspect 실행 전 필수 runtime 컨텍스트(renderFn/dispatcher/componentName)를 해석한다. */
function resolveHookInspectRuntimeContext(
  options: ResolveHookInspectRuntimeContextOptions,
): HookInspectRuntimeContext | null {
  const { fiber, getFiberName } = options;
  if (!fiber || fiber.tag === 1) return null;

  const renderFn = resolveRenderFunctionForHookInspect(fiber);
  if (typeof renderFn !== 'function') return null;

  const dispatcherRefRaw = getDispatcherRefFromGlobalHook();
  if (!dispatcherRefRaw || typeof dispatcherRefRaw !== 'object') return null;
  if (!('H' in dispatcherRefRaw)) return null;

  const dispatcherRef = dispatcherRefRaw as HookInspectDispatcherRef;
  if (typeof dispatcherRef.H === 'undefined') return null;

  return {
    fiber,
    componentName: getFiberName(fiber),
    renderFn,
    dispatcherRef,
    previousDispatcher: dispatcherRef.H,
  };
}

export { resolveHookInspectRuntimeContext };
export type { HookInspectRuntimeContext, HookInspectDispatcherRef };
