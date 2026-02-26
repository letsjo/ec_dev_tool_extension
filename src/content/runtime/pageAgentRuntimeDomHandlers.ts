interface PageDomHandlersLike {
  getDomTree: (args: Record<string, unknown> | null | undefined) => unknown;
  highlightComponent: (args: Record<string, unknown> | null | undefined) => unknown;
  clearComponentHighlight: () => unknown;
  previewComponent: (args: Record<string, unknown> | null | undefined) => unknown;
  clearHoverPreview: () => unknown;
}

/**
 * DOM handler 입력 타입을 method executor 공통 시그니처(unknown)로 어댑트한다.
 * bootstrap은 도메인 핸들러 조합만 담당하고, unknown 캐스팅 경계는 이 모듈에 모은다.
 */
export function createPageAgentRuntimeDomMethodHandlers(domHandlers: PageDomHandlersLike) {
  return {
    getDomTree(args: unknown) {
      return domHandlers.getDomTree(args as Record<string, unknown> | null | undefined);
    },
    highlightComponent(args: unknown) {
      return domHandlers.highlightComponent(args as Record<string, unknown> | null | undefined);
    },
    clearComponentHighlight() {
      return domHandlers.clearComponentHighlight();
    },
    previewComponent(args: unknown) {
      return domHandlers.previewComponent(args as Record<string, unknown> | null | undefined);
    },
    clearHoverPreview() {
      return domHandlers.clearHoverPreview();
    },
  };
}
