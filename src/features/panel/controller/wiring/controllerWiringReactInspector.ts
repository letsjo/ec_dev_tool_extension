import { createReactInspectPathBindings as createReactInspectPathBindingsValue } from '../../reactInspector/path/pathBindings';
import { createReactInspectorControllerFlows as createReactInspectorControllerFlowsValue } from '../../reactInspector/controllerFlows';
import type { CallInspectedPageAgent } from '../../bridge/pageAgentClient';
import type { ReactInspectorControllerState } from '../../reactInspector/controllerState';
import type { ReactComponentInfo } from '../../../../shared/inspector';

interface CreateControllerWiringReactInspectorOptions {
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
  detailFetchRetryCooldownMs: number;
  appendDebugLog?: (eventName: string, payload?: unknown) => void;
}

interface ControllerWiringReactInspectorDependencies {
  createReactInspectPathBindings: typeof createReactInspectPathBindingsValue;
  createReactInspectorControllerFlows: typeof createReactInspectorControllerFlowsValue;
}

const DEFAULT_DEPS: ControllerWiringReactInspectorDependencies = {
  createReactInspectPathBindings: createReactInspectPathBindingsValue,
  createReactInspectorControllerFlows: createReactInspectorControllerFlowsValue,
};

/** controller wiring에서 React Inspector path/actions + flow 결선을 조립한다. */
function createControllerWiringReactInspector(
  options: CreateControllerWiringReactInspectorOptions,
  deps: ControllerWiringReactInspectorDependencies = DEFAULT_DEPS,
) {
  const { inspectFunctionAtPath, fetchSerializedValueAtPath } =
    deps.createReactInspectPathBindings({
      callInspectedPageAgent: options.callInspectedPageAgent,
      getStoredLookup: options.state.getStoredLookup,
      setReactStatus: options.setReactStatus,
    });

  return deps.createReactInspectorControllerFlows({
    state: options.state,
    callInspectedPageAgent: options.callInspectedPageAgent,
    getReactComponentListEl: options.getReactComponentListEl,
    getTreePaneEl: options.getTreePaneEl,
    getReactComponentDetailEl: options.getReactComponentDetailEl,
    getComponentSearchInputEl: options.getComponentSearchInputEl,
    setReactStatus: options.setReactStatus,
    setReactListEmpty: options.setReactListEmpty,
    setReactDetailEmpty: options.setReactDetailEmpty,
    clearPageHoverPreview: options.clearPageHoverPreview,
    clearPageComponentHighlight: options.clearPageComponentHighlight,
    previewPageDomForComponent: options.previewPageDomForComponent,
    highlightPageDomForComponent: options.highlightPageDomForComponent,
    setDomTreeStatus: options.setDomTreeStatus,
    setDomTreeEmpty: options.setDomTreeEmpty,
    inspectFunctionAtPath,
    fetchSerializedValueAtPath,
    detailFetchRetryCooldownMs: options.detailFetchRetryCooldownMs,
    appendDebugLog: options.appendDebugLog,
  });
}

export { createControllerWiringReactInspector };
export type {
  CreateControllerWiringReactInspectorOptions,
  ControllerWiringReactInspectorDependencies,
};
