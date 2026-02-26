import type { ComponentFilterResult, ReactComponentInfo } from '../../../../shared/inspector/types';
import { renderReactComponentListTree as renderReactComponentListTreeValue } from './listTreeRenderer';

interface ReactComponentListRenderStateSnapshot {
  reactComponents: ReactComponentInfo[];
  componentSearchQuery: string;
  selectedReactComponentIndex: number;
  collapsedComponentIds: Set<string>;
  updatedComponentIds: Set<string>;
  lastReactListRenderSignature: string;
}

interface ReactComponentListRenderStateUpdate {
  updatedComponentIds?: Set<string>;
  lastReactListRenderSignature?: string;
}

interface CreateReactComponentListRenderFlowOptions {
  readState: () => ReactComponentListRenderStateSnapshot;
  writeState: (update: ReactComponentListRenderStateUpdate) => void;
  setReactListEmpty: (text: string) => void;
  buildReactComponentListEmptyText: (totalCount: number, query: string) => string;
  getComponentFilterResult: () => ComponentFilterResult;
  buildReactListRenderSignature: (
    filterResult: ComponentFilterResult,
    matchedIndexSet: Set<number>,
  ) => string;
  buildComponentIndexById: () => Map<string, number>;
  renderReactComponentListTree?: typeof renderReactComponentListTreeValue;
  getTreePaneEl: () => HTMLDivElement;
  getReactComponentListEl: () => HTMLDivElement;
  clearPaneContent: (element: HTMLElement) => void;
  previewPageDomForComponent: (component: ReactComponentInfo) => void;
  clearPageHoverPreview: () => void;
  getOnSelectComponent: () => (index: number) => void;
}

/**
 * Components Tree 목록 렌더 흐름을 구성한다.
 * - empty/filter 결과 처리
 * - signature 기반 skip/강제 렌더
 * - tree 렌더 후 업데이트 플래그 소거
 */
export function createReactComponentListRenderFlow(
  options: CreateReactComponentListRenderFlowOptions,
) {
  const renderReactComponentListTree =
    options.renderReactComponentListTree ?? renderReactComponentListTreeValue;

  return function renderReactComponentList() {
    const state = options.readState();
    if (state.reactComponents.length === 0) {
      options.setReactListEmpty(
        options.buildReactComponentListEmptyText(
          state.reactComponents.length,
          state.componentSearchQuery,
        ),
      );
      return;
    }

    const filterResult = options.getComponentFilterResult();
    const visibleIndices = filterResult.visibleIndices;
    const matchedIndexSet = new Set<number>(filterResult.matchedIndices);

    if (visibleIndices.length === 0) {
      options.setReactListEmpty(
        options.buildReactComponentListEmptyText(
          state.reactComponents.length,
          state.componentSearchQuery,
        ),
      );
      return;
    }

    const nextSignature = options.buildReactListRenderSignature(
      filterResult,
      matchedIndexSet,
    );
    const forceRenderForUpdates = state.updatedComponentIds.size > 0;
    if (
      nextSignature === state.lastReactListRenderSignature &&
      !forceRenderForUpdates
    ) {
      return;
    }

    renderReactComponentListTree({
      reactComponents: state.reactComponents,
      visibleIndices,
      matchedIndexSet,
      selectedReactComponentIndex: state.selectedReactComponentIndex,
      componentSearchQuery: state.componentSearchQuery,
      collapsedComponentIds: state.collapsedComponentIds,
      updatedComponentIds: state.updatedComponentIds,
      treePaneEl: options.getTreePaneEl(),
      reactComponentListEl: options.getReactComponentListEl(),
      idToIndex: options.buildComponentIndexById(),
      clearPaneContent: options.clearPaneContent,
      previewPageDomForComponent: options.previewPageDomForComponent,
      clearPageHoverPreview: options.clearPageHoverPreview,
      onSelectComponent: options.getOnSelectComponent(),
      onRequestRender: () => {
        renderReactComponentList();
      },
    });

    options.writeState({
      lastReactListRenderSignature: nextSignature,
      updatedComponentIds: new Set<string>(),
    });
  };
}
