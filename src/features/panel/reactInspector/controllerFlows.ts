import type { ReactComponentInfo } from '../../../shared/inspector/types';
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
  patchComponentSearchTextCacheAt as patchComponentSearchTextCacheAtValue,
} from './search';
import { createReactComponentSearchInputFlow as createReactComponentSearchInputFlowValue } from './searchInputBindingFlow';
import { createReactComponentSelectionBindingFlow as createReactComponentSelectionBindingFlowValue } from './selectionBindingFlow';
import {
  buildSearchSummaryStatusText as buildSearchSummaryStatusTextValue,
} from './searchStatus';
import type {
  FetchSerializedValueAtPathHandler,
  InspectFunctionAtPathHandler,
} from './jsonRenderTypes';
import type { ReactInspectorControllerState } from './controllerState';
import {
  applyReactInspectorPaneState as applyReactInspectorPaneStateValue,
  buildReactComponentListEmptyText as buildReactComponentListEmptyTextValue,
  buildReactInspectorLoadingPaneState as buildReactInspectorLoadingPaneStateValue,
  buildReactInspectorResetPaneState as buildReactInspectorResetPaneStateValue,
} from './viewState';
import { createReactInspectorControllerDerivations as createReactInspectorControllerDerivationsValue } from './controllerDerivations';

interface CreateReactInspectorControllerFlowsOptions {
  state: ReactInspectorControllerState;
  callInspectedPageAgent: CallInspectedPageAgent;
  getReactComponentListEl: () => HTMLDivElement;
  getTreePaneEl: () => HTMLDivElement;
  getReactComponentDetailEl: () => HTMLDivElement;
  getComponentSearchInputEl: () => HTMLInputElement;
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

  const derivations = createReactInspectorControllerDerivationsValue({
    state: options.state,
    inspectFunctionAtPath: options.inspectFunctionAtPath,
    fetchSerializedValueAtPath: options.fetchSerializedValueAtPath,
  });

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
    getComponentFilterResult: derivations.getComponentFilterResult,
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
