import { createWorkspaceLayoutManager } from './workspace/manager';
import { initWheelScrollFallback } from './workspace/wheelScrollFallback';
import { initPanelDomRefs, mountPanelView } from './domRefs';
import { createPanelControllerBootstrap } from './controllerBootstrap';
import {
  createElementSelectionFetchOptions,
  createRuntimeRefreshFetchOptions,
} from './reactInspector/fetchOptions';
import { createControllerWiringReactInspector } from './controllerWiringReactInspector';
import { createControllerWiringDataFlows } from './controllerWiringDataFlows';
import { createReactInspectorControllerState } from './reactInspector/controllerState';
import { callInspectedPageAgent } from './bridge/pageAgentClient';
import { createPanelPaneSetters } from './paneSetters';
import { createPanelControllerContext } from './controllerContext';
import {
  addInspectedPageNavigatedListener,
  getInspectedTabId,
  removeInspectedPageNavigatedListener,
} from './devtoolsNetworkBridge';
import { createPanelControllerRuntime } from './controllerRuntime';

const DETAIL_FETCH_RETRY_COOLDOWN_MS = 2500;

export interface PanelControllerWiring {
  bootstrapPanel: () => void;
}

/** panel controller 도메인 결선을 조합하고 bootstrap 핸들을 반환한다. */
export function createPanelControllerWiring(): PanelControllerWiring {
  const reactInspectorState = createReactInspectorControllerState();
  const panelControllerContext = createPanelControllerContext({
    initPanelDomRefs,
  });

  const {
    setOutput,
    setElementOutput,
    setReactStatus,
    setReactListEmpty,
    setReactDetailEmpty,
    setDomTreeStatus,
    setDomTreeEmpty,
  } = createPanelPaneSetters({
    getOutputEl: panelControllerContext.getOutputEl,
    getElementOutputEl: panelControllerContext.getElementOutputEl,
    getReactStatusEl: panelControllerContext.getReactStatusEl,
    getReactComponentListEl: panelControllerContext.getReactComponentListEl,
    getReactComponentDetailEl: panelControllerContext.getReactComponentDetailEl,
    getDomTreeStatusEl: panelControllerContext.getDomTreeStatusEl,
    getDomTreeOutputEl: panelControllerContext.getDomTreeOutputEl,
    setLastReactListRenderSignature: reactInspectorState.setLastReactListRenderSignature,
    setLastReactDetailRenderSignature: reactInspectorState.setLastReactDetailRenderSignature,
    setLastReactDetailComponentId: reactInspectorState.setLastReactDetailComponentId,
  });

  const {
    populateTargetSelect,
    onFetch,
    fetchDomTree,
    clearPageComponentHighlight,
    clearPageHoverPreview,
    previewPageDomForComponent,
    highlightPageDomForComponent,
  } = createControllerWiringDataFlows({
    callInspectedPageAgent,
    getTargetSelectEl: panelControllerContext.getTargetSelectEl,
    getFetchBtnEl: panelControllerContext.getFetchBtnEl,
    getDomTreeOutputEl: panelControllerContext.getDomTreeOutputEl,
    setOutput,
    setReactStatus,
    setElementOutput,
    setDomTreeStatus,
    setDomTreeEmpty,
  });

  const { onComponentSearchInput, fetchReactInfo } = createControllerWiringReactInspector({
    state: reactInspectorState,
    callInspectedPageAgent,
    getReactComponentListEl: panelControllerContext.getReactComponentListEl,
    getTreePaneEl: panelControllerContext.getTreePaneEl,
    getReactComponentDetailEl: panelControllerContext.getReactComponentDetailEl,
    getComponentSearchInputEl: panelControllerContext.getComponentSearchInputEl,
    setReactStatus,
    setReactListEmpty,
    setReactDetailEmpty,
    clearPageHoverPreview,
    clearPageComponentHighlight,
    previewPageDomForComponent,
    highlightPageDomForComponent,
    setDomTreeStatus,
    setDomTreeEmpty,
    detailFetchRetryCooldownMs: DETAIL_FETCH_RETRY_COOLDOWN_MS,
  });

  const {
    runtimeRefreshScheduler,
    onInspectedPageNavigated,
    onSelectElement,
    onPanelBeforeUnload,
  } = createPanelControllerRuntime({
    panelControllerContext,
    getStoredLookup: reactInspectorState.getStoredLookup,
    setStoredLookup: reactInspectorState.setStoredLookup,
    fetchReactInfoForRuntimeRefresh: (lookup, background, onDone) => {
      fetchReactInfo(
        lookup.selector,
        lookup.pickPoint,
        createRuntimeRefreshFetchOptions(background, onDone),
      );
    },
    fetchReactInfoForElementSelection: (selector, pickPoint) => {
      fetchReactInfo(selector, pickPoint, createElementSelectionFetchOptions());
    },
    clearPageHoverPreview,
    fetchDomTree,
    setElementOutput,
    setReactStatus,
    setDomTreeStatus,
    setDomTreeEmpty,
    getInspectedTabId,
    removeNavigatedListener: removeInspectedPageNavigatedListener,
  });

  const { bootstrapPanel } = createPanelControllerBootstrap({
    panelControllerContext,
    mountPanelView,
    createWorkspaceLayoutManager,
    initWheelScrollFallback,
    populateTargetSelect,
    setElementOutput,
    setDomTreeStatus,
    setDomTreeEmpty,
    onFetch,
    onSelectElement,
    onComponentSearchInput,
    clearPageHoverPreview,
    addNavigatedListener: addInspectedPageNavigatedListener.bind(null, onInspectedPageNavigated),
    onPanelBeforeUnload,
    runInitialRefresh: runtimeRefreshScheduler.refresh.bind(runtimeRefreshScheduler, false),
  });

  return {
    bootstrapPanel,
  };
}
