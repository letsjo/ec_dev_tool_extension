import { initPanelDomRefs } from '../../domRefs';
import { createControllerWiringReactInspector } from './controllerWiringReactInspector';
import { createControllerWiringDataFlows } from './controllerWiringDataFlows';
import { createControllerWiringLifecycle } from './controllerWiringLifecycle';
import { createReactInspectorControllerState } from '../../reactInspector/controllerState';
import { createPanelControllerContext } from '../context';
import { createPanelDebugDiagnosticsFlow } from '../../debugLog/debugDiagnosticsFlow';
import { createPanelDebugLogFlow } from '../../debugLog/debugLogFlow';
import { createControllerWiringPaneBindings } from './controllerWiringPane';

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
  const debugDiagnosticsFlow = createPanelDebugDiagnosticsFlow({
    getDebugDiagnosticsPaneEl: panelControllerContext.getDebugDiagnosticsPaneEl,
  });
  const { appendDebugLog } = createPanelDebugLogFlow({
    getDebugLogPaneEl: panelControllerContext.getDebugLogPaneEl,
    getDebugLogCopyBtnEl: panelControllerContext.getDebugLogCopyBtnEl,
    getDebugLogClearBtnEl: panelControllerContext.getDebugLogClearBtnEl,
    onLogAppended(eventName, payload) {
      debugDiagnosticsFlow.recordDebugEvent(eventName, payload);
    },
  });

  const {
    callInspectedPageAgentWithDebug,
    setOutputWithDebug,
    setElementOutputWithDebug,
    setReactStatusWithDebug,
    setDomTreeStatusWithDebug,
    setDomTreeEmptyWithDebug,
    setReactListEmpty,
    setReactDetailEmpty,
  } = createControllerWiringPaneBindings({
    panelControllerContext,
    reactInspectorState,
    appendDebugLog,
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
    callInspectedPageAgent: callInspectedPageAgentWithDebug,
    getTargetSelectEl: panelControllerContext.getTargetSelectEl,
    getFetchBtnEl: panelControllerContext.getFetchBtnEl,
    getDomTreeOutputEl: panelControllerContext.getDomTreeOutputEl,
    setOutput: setOutputWithDebug,
    setReactStatus: setReactStatusWithDebug,
    setElementOutput: setElementOutputWithDebug,
    setDomTreeStatus: setDomTreeStatusWithDebug,
    setDomTreeEmpty: setDomTreeEmptyWithDebug,
    appendDebugLog,
  });

  const { onComponentSearchInput, fetchReactInfo } = createControllerWiringReactInspector({
    state: reactInspectorState,
    callInspectedPageAgent: callInspectedPageAgentWithDebug,
    getReactComponentListEl: panelControllerContext.getReactComponentListEl,
    getTreePaneEl: panelControllerContext.getTreePaneEl,
    getReactComponentDetailEl: panelControllerContext.getReactComponentDetailEl,
    getComponentSearchInputEl: panelControllerContext.getComponentSearchInputEl,
    setReactStatus: setReactStatusWithDebug,
    setReactListEmpty,
    setReactDetailEmpty,
    clearPageHoverPreview,
    clearPageComponentHighlight,
    previewPageDomForComponent,
    highlightPageDomForComponent,
    setDomTreeStatus: setDomTreeStatusWithDebug,
    setDomTreeEmpty: setDomTreeEmptyWithDebug,
    detailFetchRetryCooldownMs: DETAIL_FETCH_RETRY_COOLDOWN_MS,
    appendDebugLog,
  });

  const { bootstrapPanel } = createControllerWiringLifecycle({
    panelControllerContext,
    getStoredLookup: reactInspectorState.getStoredLookup,
    setStoredLookup: reactInspectorState.setStoredLookup,
    fetchReactInfo,
    clearPageHoverPreview,
    fetchDomTree,
    setElementOutput: setElementOutputWithDebug,
    setReactStatus: setReactStatusWithDebug,
    setDomTreeStatus: setDomTreeStatusWithDebug,
    setDomTreeEmpty: setDomTreeEmptyWithDebug,
    populateTargetSelect,
    onFetch,
    onComponentSearchInput,
    appendDebugLog,
  });

  return {
    bootstrapPanel,
  };
}
