import { createPageAgentRuntimeDomMethodHandlers } from './pageAgentRuntimeDomHandlers';
import { createPageAgentRuntimeInspectHandlers } from './pageAgentRuntimeInspectHandlers';
import type { CreatePageAgentRuntimeMethodExecutorOptions } from './pageAgentRuntimeTypes';
import type { createPageDomHandlers } from '../dom/pageAgentDom';

interface CreatePageAgentRuntimeMethodHandlersOptions {
  runtimeOptions: CreatePageAgentRuntimeMethodExecutorOptions;
  domHandlers: ReturnType<typeof createPageDomHandlers>;
}

/**
 * pageAgent method executor에 주입할 method handler 묶음을 조립한다.
 * - DOM handler adapter
 * - react inspect/reactInspectPath handler
 */
function createPageAgentRuntimeMethodHandlers(
  options: CreatePageAgentRuntimeMethodHandlersOptions,
) {
  const { inspectReactComponents, inspectReactPath } =
    createPageAgentRuntimeInspectHandlers(options.runtimeOptions);

  return {
    domHandlers: createPageAgentRuntimeDomMethodHandlers(options.domHandlers),
    inspectReactComponents(args: unknown) {
      return inspectReactComponents(args);
    },
    inspectReactPath(args: unknown) {
      return inspectReactPath(args as Record<string, unknown> | null | undefined);
    },
  };
}

export { createPageAgentRuntimeMethodHandlers };
