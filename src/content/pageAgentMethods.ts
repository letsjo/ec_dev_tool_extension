import { fetchTargetData } from './pageAgentTargetFetch';

type MethodHandler = (args: unknown) => unknown;

interface DomHandlers {
  getDomTree: MethodHandler;
  highlightComponent: MethodHandler;
  clearComponentHighlight: () => unknown;
  previewComponent: MethodHandler;
  clearHoverPreview: () => unknown;
}

interface CreatePageAgentMethodExecutorOptions {
  domHandlers: DomHandlers;
  inspectReactComponents: MethodHandler;
  inspectReactPath: MethodHandler;
}

/** pageAgent method -> handler 라우터를 구성한다. */
export function createPageAgentMethodExecutor(options: CreatePageAgentMethodExecutorOptions) {
  const domHandlers = options.domHandlers;
  const inspectReactComponents = options.inspectReactComponents;
  const inspectReactPath = options.inspectReactPath;

  /** 요청된 메서드를 실행 */
  return function executeMethod(method: string, args: unknown) {
    switch (method) {
      case 'ping':
        return { ok: true };
      case 'fetchTargetData':
        return fetchTargetData(args);
      case 'getDomTree':
        return domHandlers.getDomTree(args);
      case 'highlightComponent':
        return domHandlers.highlightComponent(args);
      case 'clearComponentHighlight':
        return domHandlers.clearComponentHighlight();
      case 'previewComponent':
        return domHandlers.previewComponent(args);
      case 'clearHoverPreview':
        return domHandlers.clearHoverPreview();
      case 'reactInspect':
        return inspectReactComponents(args);
      case 'reactInspectPath':
        return inspectReactPath(args);
      default:
        return { ok: false, error: '알 수 없는 메서드입니다: ' + String(method) };
    }
  };
}
