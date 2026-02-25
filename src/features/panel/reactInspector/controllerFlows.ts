import type {
  ComponentFilterResult,
  JsonSectionKind,
  ReactComponentInfo,
} from '../../../shared/inspector/types';
import type { CallInspectedPageAgent } from '../bridge/pageAgentClient';
import { clearPaneContent as clearPaneContentValue } from '../paneState';
import {
  createReactInspectResultApplyFlow as createReactInspectResultApplyFlowValue,
} from './applyResultFlow';
import { createReactComponentDetailRenderFlow as createReactComponentDetailRenderFlowValue } from './detailRenderFlow';
import { createReactDetailQueueFlow as createReactDetailQueueFlowValue } from './detailQueueFlow';
import { renderReactComponentDetailPanel as renderReactComponentDetailPanelValue } from './detailRenderer';
import { createReactInspectFetchFlow as createReactInspectFetchFlowValue } from './fetchFlow';
import {
  resolveRuntimeRefreshLookup as resolveRuntimeRefreshLookupValue,
} from './lookup';
import { createReactComponentListRenderFlow as createReactComponentListRenderFlowValue } from './listRenderFlow';
import { renderReactComponentListTree as renderReactComponentListTreeValue } from './listTreeRenderer';
import { createSearchNoResultStateFlow as createSearchNoResultStateFlowValue } from './noResultStateFlow';
import { createReactInspectorResetStateFlow as createReactInspectorResetStateFlowValue } from './resetStateFlow';
import {
  buildComponentIndexById as buildComponentIndexByIdValue,
  ensureComponentSearchTextCache as ensureComponentSearchTextCacheValue,
  expandAncestorPaths as expandAncestorPathsValue,
  getComponentFilterResult as getComponentFilterResultValue,
  patchComponentSearchTextCacheAt as patchComponentSearchTextCacheAtValue,
} from './search';
import { createReactComponentSearchInputFlow as createReactComponentSearchInputFlowValue } from './searchInputBindingFlow';
import { createReactComponentSelectionBindingFlow as createReactComponentSelectionBindingFlowValue } from './selectionBindingFlow';
import {
  buildSearchSummaryStatusText as buildSearchSummaryStatusTextValue,
} from './searchStatus';
import {
  buildReactComponentDetailRenderSignature as buildReactComponentDetailRenderSignatureValue,
  buildReactListRenderSignature as buildReactListRenderSignatureValue,
} from './signatures';
import type {
  FetchSerializedValueAtPathHandler,
  InspectFunctionAtPathHandler,
} from './jsonRenderTypes';
import { createReactJsonSection as createReactJsonSectionValue } from './jsonSection';
import type { ReactInspectorControllerState } from './controllerState';
import {
  applyReactInspectorPaneState as applyReactInspectorPaneStateValue,
  buildReactComponentListEmptyText as buildReactComponentListEmptyTextValue,
  buildReactInspectorLoadingPaneState as buildReactInspectorLoadingPaneStateValue,
  buildReactInspectorResetPaneState as buildReactInspectorResetPaneStateValue,
} from './viewState';

interface CreateReactInspectorControllerFlowsOptions {
  state: ReactInspectorControllerState;
  callInspectedPageAgent: CallInspectedPageAgent;
  reactComponentListEl: HTMLDivElement;
  treePaneEl: HTMLDivElement;
  reactComponentDetailEl: HTMLDivElement;
  componentSearchInputEl: HTMLInputElement;
  setReactStatus: (text: string, isError?: boolean) => void;
  setReactListEmpty: (text: string) => void;
  setReactDetailEmpty: (text: string) => void;
  clearPageHoverPreview: () => void;
  clearPageComponentHighlight: () => void;
  previewPageDomForComponent: (component: ReactComponentInfo) => void;
  highlightPageDomForComponent: (component: ReactComponentInfo) => void;
  setDomTreeStatus: (text: string, isError?: boolean) => void;
  setDomTreeEmpty: (text: string) => void;
  inspectFunctionAtPath: InspectFunctionAtPathHandler;
  fetchSerializedValueAtPath: FetchSerializedValueAtPathHandler;
  detailFetchRetryCooldownMs: number;
}

/** controller의 react inspector 조립 로직을 결선 전용으로 묶는다. */
export function createReactInspectorControllerFlows(
  options: CreateReactInspectorControllerFlowsOptions,
) {
  const reactInspectorPaneSetters = {
    setReactStatus: options.setReactStatus,
    setReactListEmpty: options.setReactListEmpty,
    setReactDetailEmpty: options.setReactDetailEmpty,
  };

  /** 파생 데이터나 요약 값을 구성 */
  function buildReactComponentDetailRenderSignature(component: ReactComponentInfo): string {
    return buildReactComponentDetailRenderSignatureValue(component);
  }

  /** 파생 데이터나 요약 값을 구성 */
  function buildReactListRenderSignature(
    filterResult: ComponentFilterResult,
    matchedIndexSet: Set<number>,
  ): string {
    return buildReactListRenderSignatureValue(
      options.state.getReactComponents(),
      options.state.getComponentSearchQuery(),
      options.state.getSelectedReactComponentIndex(),
      options.state.getCollapsedComponentIds(),
      filterResult,
      matchedIndexSet,
    );
  }

  /** 렌더링에 사용할 DOM/데이터 구조를 생성 */
  function createJsonSection(
    title: string,
    value: unknown,
    component: ReactComponentInfo,
    sectionKind: JsonSectionKind,
  ): HTMLElement {
    return createReactJsonSectionValue({
      title,
      value,
      component,
      sectionKind,
      onInspectFunctionAtPath: options.inspectFunctionAtPath,
      onFetchSerializedValueAtPath: options.fetchSerializedValueAtPath,
    });
  }

  /** 필요한 값/상태를 계산해 반환 */
  function getComponentFilterResult(): ComponentFilterResult {
    options.state.setComponentSearchTexts(
      ensureComponentSearchTextCacheValue(
        options.state.getReactComponents(),
        options.state.getComponentSearchQuery(),
        options.state.getComponentSearchTexts(),
        options.state.getComponentSearchIncludeDataTokens(),
      ),
    );
    return getComponentFilterResultValue(
      options.state.getReactComponents(),
      options.state.getComponentSearchQuery(),
      options.state.getComponentSearchTexts(),
    );
  }

  /** 파생 데이터나 요약 값을 구성 */
  function buildComponentIndexById(): Map<string, number> {
    return buildComponentIndexByIdValue(options.state.getReactComponents());
  }

  /** 부모 경로를 확장 */
  function expandAncestorPaths(indices: number[]) {
    expandAncestorPathsValue(
      options.state.getReactComponents(),
      indices,
      options.state.getCollapsedComponentIds(),
    );
  }

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
    reactComponentDetailEl: options.reactComponentDetailEl,
    buildRenderSignature: buildReactComponentDetailRenderSignature,
    clearPaneContent: clearPaneContentValue,
    createJsonSection,
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
    getComponentFilterResult,
    buildReactListRenderSignature,
    buildComponentIndexById,
    renderReactComponentListTree: renderReactComponentListTreeValue,
    treePaneEl: options.treePaneEl,
    reactComponentListEl: options.reactComponentListEl,
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
    expandAncestorPaths,
    renderReactComponentList,
    getReactComponentListEl: () => options.reactComponentListEl,
    getSelectedReactComponentIndex: options.state.getSelectedReactComponentIndex,
    renderReactComponentDetail,
    setReactDetailEmpty: options.setReactDetailEmpty,
    highlightPageDomForComponent: options.highlightPageDomForComponent,
    detailFetchQueue,
    detailFetchRetryCooldownMs: options.detailFetchRetryCooldownMs,
  });

  const onComponentSearchInput = createReactComponentSearchInputFlowValue({
    getSearchInputValue: () => options.componentSearchInputEl.value,
    setComponentSearchQuery: options.state.setComponentSearchQuery,
    getComponentSearchQuery: options.state.getComponentSearchQuery,
    getReactComponents: options.state.getReactComponents,
    getSelectedReactComponentIndex: options.state.getSelectedReactComponentIndex,
    getComponentFilterResult,
    applySearchNoResultState,
    expandAncestorPaths,
    selectReactComponent,
    renderReactComponentList,
    setReactStatus: options.setReactStatus,
    buildSearchSummaryStatusText: buildSearchSummaryStatusTextValue,
  });

  const resetReactInspector = createReactInspectorResetStateFlowValue({
    writeState: options.state.writeResetState,
    resetDetailFetchQueue: () => {
      detailFetchQueue.reset();
    },
    clearPageHoverPreview: options.clearPageHoverPreview,
    clearPageComponentHighlight: options.clearPageComponentHighlight,
    applyResetPaneState: (statusText, isError) => {
      applyReactInspectorPaneStateValue(
        reactInspectorPaneSetters,
        buildReactInspectorResetPaneStateValue(statusText, isError),
      );
    },
  });

  const applyReactInspectResult = createReactInspectResultApplyFlowValue({
    readState: options.state.readApplyResultState,
    writeState: options.state.writeApplyResultState,
    getComponentFilterResult,
    setReactStatus: options.setReactStatus,
    renderReactComponentList,
    selectReactComponent,
    applySearchNoResultState: (context) => {
      applySearchNoResultState(context);
    },
    resetReactInspector,
  });

  const { fetchReactInfo } = createReactInspectFetchFlowValue({
    callInspectedPageAgent: options.callInspectedPageAgent,
    getStoredLookup: options.state.getStoredLookup,
    setStoredLookup: options.state.setStoredLookup,
    getReactComponents: options.state.getReactComponents,
    getSelectedReactComponentIndex: options.state.getSelectedReactComponentIndex,
    clearPageHoverPreview: options.clearPageHoverPreview,
    clearPageComponentHighlight: options.clearPageComponentHighlight,
    applyLoadingPaneState: () => {
      applyReactInspectorPaneStateValue(
        reactInspectorPaneSetters,
        buildReactInspectorLoadingPaneStateValue(),
      );
    },
    resetReactInspector,
    applyReactInspectResult,
  });

  return {
    onComponentSearchInput,
    fetchReactInfo,
  };
}
