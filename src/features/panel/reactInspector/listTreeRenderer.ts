import type { ReactComponentInfo } from '../../../shared/inspector/types';
import { buildChildrenByParent as buildChildrenByParentValue } from './listTreeModel';
import { renderReactTreeNodes } from './listTreeNodeRenderer';
import {
  captureReactTreeScrollAnchor as captureReactTreeScrollAnchorValue,
  restoreReactTreeScrollAnchor as restoreReactTreeScrollAnchorValue,
} from './listTreeScrollAnchor';

interface RenderReactComponentListTreeOptions {
  reactComponents: ReactComponentInfo[];
  visibleIndices: number[];
  matchedIndexSet: Set<number>;
  selectedReactComponentIndex: number;
  componentSearchQuery: string;
  collapsedComponentIds: Set<string>;
  updatedComponentIds: Set<string>;
  treePaneEl: HTMLDivElement;
  reactComponentListEl: HTMLDivElement;
  idToIndex: Map<string, number>;
  clearPaneContent: (element: HTMLElement) => void;
  previewPageDomForComponent: (component: ReactComponentInfo) => void;
  clearPageHoverPreview: () => void;
  onSelectComponent: (index: number) => void;
  onRequestRender: () => void;
}

/**
 * Components Tree DOM 렌더링을 전담한다.
 * scroll/selection anchor를 유지해 목록 리렌더 후에도 현재 위치가 크게 튀지 않도록 보정한다.
 */
export function renderReactComponentListTree(options: RenderReactComponentListTreeOptions) {
  const scrollAnchor = captureReactTreeScrollAnchorValue({
    treePaneEl: options.treePaneEl,
    reactComponentListEl: options.reactComponentListEl,
    selectedReactComponentIndex: options.selectedReactComponentIndex,
  });

  const childrenByParent = buildChildrenByParentValue(
    options.reactComponents,
    options.visibleIndices,
    options.idToIndex,
  );

  options.clearPaneContent(options.reactComponentListEl);
  options.reactComponentListEl.classList.remove('empty');

  renderReactTreeNodes({
    rootIndices: childrenByParent.get(null) ?? [],
    childrenByParent,
    reactComponents: options.reactComponents,
    selectedReactComponentIndex: options.selectedReactComponentIndex,
    componentSearchQuery: options.componentSearchQuery,
    matchedIndexSet: options.matchedIndexSet,
    collapsedComponentIds: options.collapsedComponentIds,
    updatedComponentIds: options.updatedComponentIds,
    reactComponentListEl: options.reactComponentListEl,
    previewPageDomForComponent: options.previewPageDomForComponent,
    clearPageHoverPreview: options.clearPageHoverPreview,
    onSelectComponent: options.onSelectComponent,
    onRequestRender: options.onRequestRender,
  });

  restoreReactTreeScrollAnchorValue({
    treePaneEl: options.treePaneEl,
    reactComponentListEl: options.reactComponentListEl,
    anchor: scrollAnchor,
  });
}
