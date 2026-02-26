import { createPageDomHandlers } from './dom/pageAgentDom';
import { createPageAgentMethodExecutor } from './pageAgentMethods';
import { createPageAgentRuntimeInspectHandlers } from './runtime/pageAgentRuntimeInspectHandlers';
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

  const { inspectReactComponents, inspectReactPath } =
    createPageAgentRuntimeInspectHandlers(options);

  return createPageAgentMethodExecutor({
    domHandlers: {
      getDomTree(args) {
        return domHandlers.getDomTree(args as Record<string, unknown> | null | undefined);
      },
      highlightComponent(args) {
        return domHandlers.highlightComponent(args as Record<string, unknown> | null | undefined);
      },
      clearComponentHighlight() {
        return domHandlers.clearComponentHighlight();
      },
      previewComponent(args) {
        return domHandlers.previewComponent(args as Record<string, unknown> | null | undefined);
      },
      clearHoverPreview() {
        return domHandlers.clearHoverPreview();
      },
    },
    inspectReactComponents(args) {
      return inspectReactComponents(args);
    },
    inspectReactPath(args) {
      return inspectReactPath(args as Record<string, unknown> | null | undefined);
    },
  });
}

export { createPageAgentRuntimeMethodExecutor };
export type { CreatePageAgentRuntimeMethodExecutorOptions };
