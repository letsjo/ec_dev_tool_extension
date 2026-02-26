import { createPageDomHandlers } from './dom/pageAgentDom';
import { createPageAgentMethodExecutor } from './pageAgentMethods';
import { createPageAgentRuntimeMethodHandlers } from './runtime/pageAgentRuntimeMethodHandlers';
import type {
  CreatePageAgentRuntimeMethodExecutorOptions,
  MethodExecutor,
} from './runtime/pageAgentRuntimeTypes';

/**
 * pageAgent runtime 초기화 단계(도메인 핸들러 + inspect + method executor)를 조립한다.
 * runtime entry는 bridge 설치 단계만 남기기 위해 executeMethod 생성을 분리한다.
 */
function createPageAgentRuntimeMethodExecutor(
  options: CreatePageAgentRuntimeMethodExecutorOptions,
): MethodExecutor {
  const domHandlers = createPageDomHandlers({
    componentHighlightStorageKey: options.componentHighlightStorageKey,
    hoverPreviewStorageKey: options.hoverPreviewStorageKey,
  });

  return createPageAgentMethodExecutor(
    createPageAgentRuntimeMethodHandlers({
      runtimeOptions: options,
      domHandlers,
    }),
  );
}

export { createPageAgentRuntimeMethodExecutor };
export type { CreatePageAgentRuntimeMethodExecutorOptions };
