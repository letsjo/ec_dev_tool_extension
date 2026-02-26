import {
  createReactInspectResultApplyFlow as createReactInspectResultApplyFlowValue,
} from './applyResultFlow';
import { createReactInspectFetchFlow as createReactInspectFetchFlowValue } from './fetchFlow';
import { createReactInspectorResetStateFlow as createReactInspectorResetStateFlowValue } from './resetStateFlow';
import type {
  CreateReactInspectorControllerFlowsOptions,
  ReactInspectorPaneSetters,
} from './controllerFlowTypes';
import {
  applyReactInspectorPaneState as applyReactInspectorPaneStateValue,
  buildReactInspectorLoadingPaneState as buildReactInspectorLoadingPaneStateValue,
  buildReactInspectorResetPaneState as buildReactInspectorResetPaneStateValue,
} from '../viewState';
import { createReactInspectorControllerDerivations as createReactInspectorControllerDerivationsValue } from '../controllerDerivations';
import { createReactInspectorInteractionFlowWiring as createReactInspectorInteractionFlowWiringValue } from './controllerFlowInteractionWiring';

/** controller의 react inspector 조립 로직을 결선 전용으로 묶는다. */
export function createReactInspectorControllerFlows(
  options: CreateReactInspectorControllerFlowsOptions,
) {
  const reactInspectorPaneSetters: ReactInspectorPaneSetters = {
    setReactStatus: options.setReactStatus,
    setReactListEmpty: options.setReactListEmpty,
    setReactDetailEmpty: options.setReactDetailEmpty,
  };

  const derivations = createReactInspectorControllerDerivationsValue({
    state: options.state,
    inspectFunctionAtPath: options.inspectFunctionAtPath,
    fetchSerializedValueAtPath: options.fetchSerializedValueAtPath,
  });

  const interactionFlowWiring = createReactInspectorInteractionFlowWiringValue({
    options,
    derivations,
  });

  const resetReactInspector = createReactInspectorResetStateFlowValue({
    writeState: options.state.writeResetState,
    resetDetailFetchQueue: () => {
      interactionFlowWiring.detailFetchQueue.reset();
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
    renderReactComponentList: interactionFlowWiring.renderReactComponentList,
    selectReactComponent: interactionFlowWiring.selectReactComponent,
    applySearchNoResultState: interactionFlowWiring.applySearchNoResultState,
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
    appendDebugLog: options.appendDebugLog,
  });

  return {
    onComponentSearchInput: interactionFlowWiring.onComponentSearchInput,
    fetchReactInfo,
  };
}
