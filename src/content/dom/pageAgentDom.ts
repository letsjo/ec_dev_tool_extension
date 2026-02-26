import { createGetDomTreeHandler as createGetDomTreeHandlerValue } from "./pageAgentDomTree";
import { createDomHighlightHandlers as createDomHighlightHandlersValue } from "./pageAgentDomHighlight";
import {
  buildCssSelector,
  getElementPath,
  resolveTargetElement,
} from './pageAgentDomSelectors';

interface CreatePageDomHandlersOptions {
  componentHighlightStorageKey: string;
  hoverPreviewStorageKey: string;
}

/** pageAgent의 DOM 관련 메서드 핸들러를 구성한다. */
export function createPageDomHandlers(options: CreatePageDomHandlersOptions) {
  const getDomTree = createGetDomTreeHandlerValue({
    buildCssSelector,
    getElementPath,
    resolveTargetElement,
  });

  const {
    clearComponentHighlight,
    clearHoverPreview,
    highlightComponent,
    previewComponent,
  } = createDomHighlightHandlersValue({
    componentHighlightStorageKey: options.componentHighlightStorageKey,
    hoverPreviewStorageKey: options.hoverPreviewStorageKey,
    buildCssSelector,
    getElementPath,
  });

  return {
    getDomTree,
    clearComponentHighlight,
    clearHoverPreview,
    highlightComponent,
    previewComponent,
  };
}

export { buildCssSelector, getElementPath, resolveTargetElement };
