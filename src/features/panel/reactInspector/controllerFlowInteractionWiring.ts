import type { SearchNoResultContext } from './searchStatus';
import type { ReactComponentInfo } from '../../../shared/inspector';
import { clearPaneContent as clearPaneContentValue } from '../paneState';
import {
  createReactComponentDetailRenderFlow as createReactComponentDetailRenderFlowValue,
} from './detail/detailRenderFlow';
import { createReactDetailQueueFlow as createReactDetailQueueFlowValue } from './detail/detailQueueFlow';
import { renderReactComponentDetailPanel as renderReactComponentDetailPanelValue } from './detail/detailRenderer';
import {
  resolveRuntimeRefreshLookup as resolveRuntimeRefreshLookupValue,
} from './lookup';
import { createReactComponentListRenderFlow as createReactComponentListRenderFlowValue } from './list/listRenderFlow';
import { renderReactComponentListTree as renderReactComponentListTreeValue } from './list/listTreeRenderer';
import { createSearchNoResultStateFlow as createSearchNoResultStateFlowValue } from './flow/noResultStateFlow';
import {
  patchComponentSearchTextCacheAt as patchComponentSearchTextCacheAtValue,
} from './search';
import { createReactComponentSearchInputFlow as createReactComponentSearchInputFlowValue } from './searchInputBindingFlow';
import { createReactComponentSelectionBindingFlow as createReactComponentSelectionBindingFlowValue } from './selectionBindingFlow';
import {
  buildSearchSummaryStatusText as buildSearchSummaryStatusTextValue,
} from './searchStatus';
import type { ReactInspectorControllerDerivations } from './controllerDerivations';
import type { CreateReactInspectorControllerFlowsOptions } from './controllerFlowTypes';
import { buildReactComponentListEmptyText as buildReactComponentListEmptyTextValue } from './viewState';

interface CreateReactInspectorInteractionFlowWiringOptions {
  options: CreateReactInspectorControllerFlowsOptions;
  derivations: ReactInspectorControllerDerivations;
}

interface DetailFetchQueueLike {
  reset: () => void;
}

export interface ReactInspectorInteractionFlowWiring {
  onComponentSearchInput: () => void;
  renderReactComponentList: () => void;
  selectReactComponent: (index: number) => void;
  applySearchNoResultState: (
    context: SearchNoResultContext,
    options?: { clearHoverPreview?: boolean },
  ) => void;
  detailFetchQueue: DetailFetchQueueLike;
}

/**
 * react inspector의 상호작용 결선(list/detail 렌더, selection, search, detail queue)을 묶는다.
 * controllerFlows는 reset/apply/fetch 파이프라인 오케스트레이션에 집중한다.
 */
export function createReactInspectorInteractionFlowWiring({
  options,
  derivations,
}: CreateReactInspectorInteractionFlowWiringOptions): ReactInspectorInteractionFlowWiring {
  const applySearchNoResultState = createSearchNoResultStateFlowValue({
    getTotalComponentCount: () => options.state.getReactComponents().length,
    renderReactComponentList,
    setReactDetailEmpty: options.setReactDetailEmpty,
    setReactStatus: options.setReactStatus,
    clearPageHoverPreview: options.clearPageHoverPreview,
    clearPageComponentHighlight: options.clearPageComponentHighlight,
    setDomTreeStatus: options.setDomTreeStatus,
    setDomTreeEmpty: options.setDomTreeEmpty,
  });

  const renderReactComponentDetailFlow = createReactComponentDetailRenderFlowValue({
    readState: options.state.readDetailRenderState,
    writeState: options.state.writeDetailRenderState,
    getReactComponentDetailEl: options.getReactComponentDetailEl,
    buildRenderSignature: derivations.buildReactComponentDetailRenderSignature,
    clearPaneContent: clearPaneContentValue,
    createJsonSection: derivations.createJsonSection,
    renderReactComponentDetailPanel: renderReactComponentDetailPanelValue,
  });

  /** 화면 요소를 렌더링 */
  function renderReactComponentDetail(component: ReactComponentInfo) {
    renderReactComponentDetailFlow(component);
  }

  const renderReactComponentListFlow = createReactComponentListRenderFlowValue({
    readState: options.state.readListRenderState,
    writeState: options.state.writeListRenderState,
    setReactListEmpty: options.setReactListEmpty,
    buildReactComponentListEmptyText: buildReactComponentListEmptyTextValue,
    getComponentFilterResult: derivations.getComponentFilterResult,
    buildReactListRenderSignature: derivations.buildReactListRenderSignature,
    buildComponentIndexById: derivations.buildComponentIndexById,
    renderReactComponentListTree: renderReactComponentListTreeValue,
    getTreePaneEl: options.getTreePaneEl,
    getReactComponentListEl: options.getReactComponentListEl,
    clearPaneContent: clearPaneContentValue,
    previewPageDomForComponent: options.previewPageDomForComponent,
    clearPageHoverPreview: options.clearPageHoverPreview,
    getOnSelectComponent: () => selectReactComponent,
  });

  /** 화면 요소를 렌더링 */
  function renderReactComponentList() {
    renderReactComponentListFlow();
  }

  const { detailFetchQueue } = createReactDetailQueueFlowValue({
    cooldownMs: options.detailFetchRetryCooldownMs,
    callInspectedPageAgent: options.callInspectedPageAgent,
    getLookup: () => resolveRuntimeRefreshLookupValue(options.state.getStoredLookup()),
    getReactComponents: options.state.getReactComponents,
    setReactComponents: options.state.setReactComponents,
    getSelectedReactComponentIndex: options.state.getSelectedReactComponentIndex,
    getComponentSearchTexts: options.state.getComponentSearchTexts,
    getComponentSearchIncludeDataTokens: options.state.getComponentSearchIncludeDataTokens,
    patchComponentSearchTextCacheAt: patchComponentSearchTextCacheAtValue,
    renderReactComponentDetail,
    setReactDetailEmpty: options.setReactDetailEmpty,
  });

  const { selectReactComponent } = createReactComponentSelectionBindingFlowValue({
    getReactComponents: options.state.getReactComponents,
    setSelectedComponentIndex: options.state.setSelectedReactComponentIndex,
    clearPageHoverPreview: options.clearPageHoverPreview,
    expandAncestorPaths: derivations.expandAncestorPaths,
    renderReactComponentList,
    getReactComponentListEl: options.getReactComponentListEl,
    getSelectedReactComponentIndex: options.state.getSelectedReactComponentIndex,
    renderReactComponentDetail,
    setReactDetailEmpty: options.setReactDetailEmpty,
    highlightPageDomForComponent: options.highlightPageDomForComponent,
    detailFetchQueue,
    detailFetchRetryCooldownMs: options.detailFetchRetryCooldownMs,
  });

  const onComponentSearchInput = createReactComponentSearchInputFlowValue({
    getSearchInputValue: () => options.getComponentSearchInputEl().value,
    setComponentSearchQuery: options.state.setComponentSearchQuery,
    getComponentSearchQuery: options.state.getComponentSearchQuery,
    getReactComponents: options.state.getReactComponents,
    getSelectedReactComponentIndex: options.state.getSelectedReactComponentIndex,
    getComponentFilterResult: derivations.getComponentFilterResult,
    applySearchNoResultState,
    expandAncestorPaths: derivations.expandAncestorPaths,
    selectReactComponent,
    renderReactComponentList,
    setReactStatus: options.setReactStatus,
    buildSearchSummaryStatusText: buildSearchSummaryStatusTextValue,
  });

  return {
    onComponentSearchInput,
    renderReactComponentList,
    selectReactComponent,
    applySearchNoResultState,
    detailFetchQueue,
  };
}
