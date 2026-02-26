import { createDomTreeFetchFlow as createDomTreeFetchFlowValue } from './domTree/fetchFlow';
import { createPanelSelectionSyncHandlers as createPanelSelectionSyncHandlersValue } from './pageAgent/selectionSync';
import { createTargetFetchFlow as createTargetFetchFlowValue } from './targetFetch/flow';
import type { CallInspectedPageAgent } from './bridge/pageAgentClient';

interface CreateControllerWiringDataFlowsOptions {
  callInspectedPageAgent: CallInspectedPageAgent;
  getTargetSelectEl: () => HTMLSelectElement | null;
  getFetchBtnEl: () => HTMLButtonElement | null;
  getDomTreeOutputEl: () => HTMLDivElement;
  setOutput: (text: string, isError?: boolean) => void;
  setReactStatus: (text: string, isError?: boolean) => void;
  setElementOutput: (text: string) => void;
  setDomTreeStatus: (text: string, isError?: boolean) => void;
  setDomTreeEmpty: (text: string) => void;
}

interface ControllerWiringDataFlowsDependencies {
  createTargetFetchFlow: typeof createTargetFetchFlowValue;
  createDomTreeFetchFlow: typeof createDomTreeFetchFlowValue;
  createPanelSelectionSyncHandlers: typeof createPanelSelectionSyncHandlersValue;
}

const DEFAULT_DEPS: ControllerWiringDataFlowsDependencies = {
  createTargetFetchFlow: createTargetFetchFlowValue,
  createDomTreeFetchFlow: createDomTreeFetchFlowValue,
  createPanelSelectionSyncHandlers: createPanelSelectionSyncHandlersValue,
};

/** controller wiring에서 target/dom/selection 동기화 결선만 분리해 조립한다. */
function createControllerWiringDataFlows(
  options: CreateControllerWiringDataFlowsOptions,
  deps: ControllerWiringDataFlowsDependencies = DEFAULT_DEPS,
) {
  const { populateTargetSelect, onFetch } = deps.createTargetFetchFlow({
    getTargetSelectEl: options.getTargetSelectEl,
    getFetchBtnEl: options.getFetchBtnEl,
    setOutput: options.setOutput,
    callInspectedPageAgent: options.callInspectedPageAgent,
  });

  const { fetchDomTree } = deps.createDomTreeFetchFlow({
    callInspectedPageAgent: options.callInspectedPageAgent,
    getDomTreeOutputEl: options.getDomTreeOutputEl,
    setDomTreeStatus: options.setDomTreeStatus,
    setDomTreeEmpty: options.setDomTreeEmpty,
  });

  return {
    populateTargetSelect,
    onFetch,
    fetchDomTree,
    ...deps.createPanelSelectionSyncHandlers({
      callInspectedPageAgent: options.callInspectedPageAgent,
      setReactStatus: options.setReactStatus,
      setElementOutput: options.setElementOutput,
      setDomTreeStatus: options.setDomTreeStatus,
      setDomTreeEmpty: options.setDomTreeEmpty,
      fetchDomTree,
    }),
  };
}

export { createControllerWiringDataFlows };
export type {
  CreateControllerWiringDataFlowsOptions,
  ControllerWiringDataFlowsDependencies,
};
