import type {
  JsonSectionKind,
  ReactComponentInfo,
} from '../../../shared/inspector/types';
import {
  renderReactComponentDetailPanel as renderReactComponentDetailPanelValue,
} from './detailRenderer';

interface ReactComponentDetailRenderStateSnapshot {
  lastReactDetailComponentId: string | null;
  lastReactDetailRenderSignature: string;
}

interface ReactComponentDetailRenderStateUpdate {
  lastReactDetailComponentId: string | null;
  lastReactDetailRenderSignature: string;
}

interface CreateReactComponentDetailRenderFlowOptions {
  readState: () => ReactComponentDetailRenderStateSnapshot;
  writeState: (update: ReactComponentDetailRenderStateUpdate) => void;
  reactComponentDetailEl: HTMLDivElement;
  buildRenderSignature: (component: ReactComponentInfo) => string;
  clearPaneContent: (element: HTMLElement) => void;
  createJsonSection: (
    title: string,
    value: unknown,
    component: ReactComponentInfo,
    sectionKind: JsonSectionKind,
  ) => HTMLElement;
  renderReactComponentDetailPanel?: typeof renderReactComponentDetailPanelValue;
}

/** 선택 컴포넌트 상세 패널 렌더 + render cache 상태 갱신 흐름을 구성한다. */
export function createReactComponentDetailRenderFlow(
  options: CreateReactComponentDetailRenderFlowOptions,
) {
  const renderReactComponentDetailPanel =
    options.renderReactComponentDetailPanel ?? renderReactComponentDetailPanelValue;

  return function renderReactComponentDetail(component: ReactComponentInfo) {
    const state = options.readState();
    const nextCache = renderReactComponentDetailPanel({
      component,
      cache: {
        componentId: state.lastReactDetailComponentId,
        renderSignature: state.lastReactDetailRenderSignature,
      },
      reactComponentDetailEl: options.reactComponentDetailEl,
      buildRenderSignature: options.buildRenderSignature,
      clearPaneContent: options.clearPaneContent,
      createJsonSection: options.createJsonSection,
    });

    options.writeState({
      lastReactDetailComponentId: nextCache.componentId,
      lastReactDetailRenderSignature: nextCache.renderSignature,
    });
  };
}
