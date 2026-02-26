import { initPanelDomRefs } from '../../domRefs';
import { createControllerWiringReactInspector } from './controllerWiringReactInspector';
import { createControllerWiringDataFlows } from './controllerWiringDataFlows';
import { createControllerWiringLifecycle } from './controllerWiringLifecycle';
import { createReactInspectorControllerState } from '../../reactInspector/controllerState';
import {
  callInspectedPageAgent,
  type CallInspectedPageAgent,
} from '../../bridge/pageAgentClient';
import { createPanelPaneSetters } from '../../paneSetters';
import { createPanelControllerContext } from '../context';
import { createPanelDebugDiagnosticsFlow } from '../../debugLog/debugDiagnosticsFlow';
import { createPanelDebugLogFlow } from '../../debugLog/debugLogFlow';

const DETAIL_FETCH_RETRY_COOLDOWN_MS = 2500;

function summarizeDebugPayload(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') return value.length > 260 ? `${value.slice(0, 260)}…` : value;
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (typeof value === 'function') return `[Function ${(value as Function).name || 'anonymous'}]`;

  if (Array.isArray(value)) {
    return {
      type: 'array',
      length: value.length,
    };
  }

  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return {
      type: 'object',
      keys: Object.keys(record).slice(0, 12),
      ok: record.ok,
      error: typeof record.error === 'string' ? record.error : undefined,
    };
  }

  return String(value);
}

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
    onLogAppended(eventName) {
      debugDiagnosticsFlow.recordDebugEvent(eventName);
    },
  });
  let pageAgentRequestIdSeq = 0;

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

  const callInspectedPageAgentWithDebug: CallInspectedPageAgent = (method, args, onDone) => {
    const requestId = pageAgentRequestIdSeq + 1;
    pageAgentRequestIdSeq = requestId;
    appendDebugLog('pageAgent.request', {
      requestId,
      method,
      args: summarizeDebugPayload(args),
    });
    callInspectedPageAgent(method, args, (result, errorText) => {
      appendDebugLog('pageAgent.response', {
        requestId,
        method,
        hasError: Boolean(errorText),
        errorText: errorText ?? null,
        result: summarizeDebugPayload(result),
      });
      onDone(result, errorText);
    });
  };

  const setOutputWithDebug = (text: string, isError?: boolean) => {
    appendDebugLog('pane.rawResult.update', { isError: isError === true, text });
    setOutput(text, isError);
  };
  const setElementOutputWithDebug = (text: string) => {
    appendDebugLog('pane.selectedElement.update', { text });
    setElementOutput(text);
  };
  const setReactStatusWithDebug = (text: string, isError?: boolean) => {
    appendDebugLog('pane.reactStatus.update', { isError: isError === true, text });
    setReactStatus(text, isError);
  };
  const setDomTreeStatusWithDebug = (text: string, isError?: boolean) => {
    appendDebugLog('pane.domTreeStatus.update', { isError: isError === true, text });
    setDomTreeStatus(text, isError);
  };
  const setDomTreeEmptyWithDebug = (text: string) => {
    appendDebugLog('pane.domTreeBody.update', { text });
    setDomTreeEmpty(text);
  };

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
