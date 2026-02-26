import { createPanelBootstrapFlow as createPanelBootstrapFlowValue } from '../lifecycle/bootstrapFlow';
import { createPanelWorkspaceInitialization as createPanelWorkspaceInitializationValue } from '../lifecycle/panelWorkspaceInitialization';
import type { PanelControllerContext } from './context';
import type { createWorkspaceLayoutManager as createWorkspaceLayoutManagerValue } from '../workspace/manager';
import type { initWheelScrollFallback as initWheelScrollFallbackValue } from '../workspace/wheelScrollFallback';
import {
  createBootstrapFlowBindings as createBootstrapFlowBindingsValue,
  createWorkspaceInitializationBindings as createWorkspaceInitializationBindingsValue,
} from './bootstrapBindings';

interface CreatePanelControllerBootstrapOptions {
  panelControllerContext: PanelControllerContext;
  mountPanelView: () => void;
  createWorkspaceLayoutManager: typeof createWorkspaceLayoutManagerValue;
  initWheelScrollFallback: typeof initWheelScrollFallbackValue;
  populateTargetSelect: () => void;
  setElementOutput: (text: string) => void;
  setDomTreeStatus: (text: string, isError?: boolean) => void;
  setDomTreeEmpty: (text: string) => void;
  onFetch: () => void;
  onSelectElement: () => void;
  onTogglePayloadMode: () => void;
  onComponentSearchInput: () => void;
  clearPageHoverPreview: () => void;
  addNavigatedListener: () => void;
  onPanelBeforeUnload: () => void;
  runInitialRefresh: () => void;
}

interface PanelControllerBootstrapDependencies {
  createPanelWorkspaceInitialization: typeof createPanelWorkspaceInitializationValue;
  createPanelBootstrapFlow: typeof createPanelBootstrapFlowValue;
  createWorkspaceInitializationBindings: typeof createWorkspaceInitializationBindingsValue;
  createBootstrapFlowBindings: typeof createBootstrapFlowBindingsValue;
}

const PANEL_CONTROLLER_BOOTSTRAP_DEFAULT_DEPS: PanelControllerBootstrapDependencies = {
  createPanelWorkspaceInitialization: createPanelWorkspaceInitializationValue,
  createPanelBootstrapFlow: createPanelBootstrapFlowValue,
  createWorkspaceInitializationBindings: createWorkspaceInitializationBindingsValue,
  createBootstrapFlowBindings: createBootstrapFlowBindingsValue,
};

/** controller bootstrap/workspace 초기화 결선을 조립한다. */
export function createPanelControllerBootstrap(
  options: CreatePanelControllerBootstrapOptions,
  deps: PanelControllerBootstrapDependencies = PANEL_CONTROLLER_BOOTSTRAP_DEFAULT_DEPS,
): { bootstrapPanel: () => void } {
  const workspaceInitializationBindings = deps.createWorkspaceInitializationBindings(options);
  const { initializeWorkspaceLayout, initializeWheelFallback } =
    deps.createPanelWorkspaceInitialization(workspaceInitializationBindings);

  const bootstrapFlowBindings = deps.createBootstrapFlowBindings(options, {
    initializeWorkspaceLayout,
    initializeWheelFallback,
  });
  return deps.createPanelBootstrapFlow(bootstrapFlowBindings);
}
