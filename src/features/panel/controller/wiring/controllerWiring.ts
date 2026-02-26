import { initPanelDomRefs } from '../../domRefs';
import { createControllerWiringReactInspector } from './controllerWiringReactInspector';
import { createControllerWiringDataFlows } from './controllerWiringDataFlows';
import { createControllerWiringLifecycle } from './controllerWiringLifecycle';
import { createReactInspectorControllerState } from '../../reactInspector/controllerState';
import { callInspectedPageAgent } from '../../bridge/pageAgentClient';
import { createPanelPaneSetters } from '../../paneSetters';
import { createPanelControllerContext } from '../context';

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

  const { bootstrapPanel } = createControllerWiringLifecycle({
    panelControllerContext,
    getStoredLookup: reactInspectorState.getStoredLookup,
    setStoredLookup: reactInspectorState.setStoredLookup,
    fetchReactInfo,
    clearPageHoverPreview,
    fetchDomTree,
    setElementOutput,
    setReactStatus,
    setDomTreeStatus,
    setDomTreeEmpty,
    populateTargetSelect,
    onFetch,
    onComponentSearchInput,
  });

  return {
    bootstrapPanel,
  };
}
