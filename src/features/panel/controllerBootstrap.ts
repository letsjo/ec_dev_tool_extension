import { createPanelBootstrapFlow as createPanelBootstrapFlowValue } from './lifecycle/bootstrapFlow';
import { createPanelWorkspaceInitialization as createPanelWorkspaceInitializationValue } from './lifecycle/panelWorkspaceInitialization';
import type { PanelControllerContext } from './controllerContext';
import type { createWorkspaceLayoutManager as createWorkspaceLayoutManagerValue } from './workspace/manager';
import type { initWheelScrollFallback as initWheelScrollFallbackValue } from './workspace/wheelScrollFallback';

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
  onComponentSearchInput: () => void;
  clearPageHoverPreview: () => void;
  addNavigatedListener: () => void;
  onPanelBeforeUnload: () => void;
  runInitialRefresh: () => void;
}

interface PanelControllerBootstrapDependencies {
  createPanelWorkspaceInitialization: typeof createPanelWorkspaceInitializationValue;
  createPanelBootstrapFlow: typeof createPanelBootstrapFlowValue;
}

const PANEL_CONTROLLER_BOOTSTRAP_DEFAULT_DEPS: PanelControllerBootstrapDependencies = {
  createPanelWorkspaceInitialization: createPanelWorkspaceInitializationValue,
  createPanelBootstrapFlow: createPanelBootstrapFlowValue,
};

/** controller bootstrap/workspace 초기화 결선을 조립한다. */
export function createPanelControllerBootstrap(
  options: CreatePanelControllerBootstrapOptions,
  deps: PanelControllerBootstrapDependencies = PANEL_CONTROLLER_BOOTSTRAP_DEFAULT_DEPS,
): { bootstrapPanel: () => void } {
  const { initializeWorkspaceLayout, initializeWheelFallback } =
    deps.createPanelWorkspaceInitialization({
      getPanelWorkspaceEl: options.panelControllerContext.getPanelWorkspaceEl,
      getPanelContentEl: options.panelControllerContext.getPanelContentEl,
      getWorkspacePanelToggleBarEl: options.panelControllerContext.getWorkspacePanelToggleBarEl,
      getWorkspaceDockPreviewEl: options.panelControllerContext.getWorkspaceDockPreviewEl,
      getWorkspacePanelElements: options.panelControllerContext.getWorkspacePanelElements,
      createWorkspaceLayoutManager: options.createWorkspaceLayoutManager,
      initWheelScrollFallback: options.initWheelScrollFallback,
      setWorkspaceLayoutManager: options.panelControllerContext.setWorkspaceLayoutManager,
      setDestroyWheelScrollFallback: options.panelControllerContext.setDestroyWheelScrollFallback,
    });

  return deps.createPanelBootstrapFlow({
    mountPanelView: options.mountPanelView,
    initDomRefs: options.panelControllerContext.initDomRefs,
    initializeWorkspaceLayout,
    initializeWheelFallback,
    setPickerModeActive: options.panelControllerContext.setPickerModeActive,
    populateTargetSelect: options.populateTargetSelect,
    setElementOutput: options.setElementOutput,
    setDomTreeStatus: options.setDomTreeStatus,
    setDomTreeEmpty: options.setDomTreeEmpty,
    getFetchBtnEl: options.panelControllerContext.getFetchBtnEl,
    getSelectElementBtnEl: options.panelControllerContext.getSelectElementBtnEl,
    getComponentSearchInputEl: options.panelControllerContext.getComponentSearchInputEl,
    getReactComponentListEl: options.panelControllerContext.getReactComponentListEl,
    onFetch: options.onFetch,
    onSelectElement: options.onSelectElement,
    onComponentSearchInput: options.onComponentSearchInput,
    clearPageHoverPreview: options.clearPageHoverPreview,
    addNavigatedListener: options.addNavigatedListener,
    onBeforeUnload: options.onPanelBeforeUnload,
    runInitialRefresh: options.runInitialRefresh,
  });
}
