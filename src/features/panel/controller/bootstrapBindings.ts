import type { createPanelBootstrapFlow as createPanelBootstrapFlowValue } from '../lifecycle/bootstrapFlow';
import type { createPanelWorkspaceInitialization as createPanelWorkspaceInitializationValue } from '../lifecycle/panelWorkspaceInitialization';
import type { PanelControllerContext } from './context';
import type { createWorkspaceLayoutManager as createWorkspaceLayoutManagerValue } from '../workspace/manager';
import type { initWheelScrollFallback as initWheelScrollFallbackValue } from '../workspace/wheelScrollFallback';

interface CreatePanelControllerBootstrapBindingsOptions {
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

interface WorkspaceInitializationCallbacks {
  initializeWorkspaceLayout: () => void;
  initializeWheelFallback: () => void;
}

/** panel context getter/setter를 workspace initialization 입력으로 정규화한다. */
export function createWorkspaceInitializationBindings(
  options: CreatePanelControllerBootstrapBindingsOptions,
): Parameters<typeof createPanelWorkspaceInitializationValue>[0] {
  return {
    // workspace 초기화는 DOM getter와 manager setter를 함께 받아야 결선이 단순해진다.
    getPanelWorkspaceEl: options.panelControllerContext.getPanelWorkspaceEl,
    getPanelContentEl: options.panelControllerContext.getPanelContentEl,
    getWorkspacePanelToggleBarEl: options.panelControllerContext.getWorkspacePanelToggleBarEl,
    getWorkspaceDockPreviewEl: options.panelControllerContext.getWorkspaceDockPreviewEl,
    getWorkspacePanelElements: options.panelControllerContext.getWorkspacePanelElements,
    createWorkspaceLayoutManager: options.createWorkspaceLayoutManager,
    initWheelScrollFallback: options.initWheelScrollFallback,
    setWorkspaceLayoutManager: options.panelControllerContext.setWorkspaceLayoutManager,
    setDestroyWheelScrollFallback: options.panelControllerContext.setDestroyWheelScrollFallback,
  };
}

/**
 * workspace 초기화 callback과 panel 이벤트 콜백을 bootstrap flow 입력으로 정규화한다.
 * bootstrap.ts는 결선 순서만 관리하고 상세 getter/handler 매핑은 이 모듈로 위임한다.
 */
export function createBootstrapFlowBindings(
  options: CreatePanelControllerBootstrapBindingsOptions,
  workspaceInitialization: WorkspaceInitializationCallbacks,
): Parameters<typeof createPanelBootstrapFlowValue>[0] {
  return {
    mountPanelView: options.mountPanelView,
    initDomRefs: options.panelControllerContext.initDomRefs,
    initializeWorkspaceLayout: workspaceInitialization.initializeWorkspaceLayout,
    initializeWheelFallback: workspaceInitialization.initializeWheelFallback,
    // picker/payload/search/list DOM 이벤트 바인딩은 bootstrap flow가 담당한다.
    setPickerModeActive: options.panelControllerContext.setPickerModeActive,
    populateTargetSelect: options.populateTargetSelect,
    setElementOutput: options.setElementOutput,
    setDomTreeStatus: options.setDomTreeStatus,
    setDomTreeEmpty: options.setDomTreeEmpty,
    getFetchBtnEl: options.panelControllerContext.getFetchBtnEl,
    getSelectElementBtnEl: options.panelControllerContext.getSelectElementBtnEl,
    getPayloadModeBtnEl: options.panelControllerContext.getPayloadModeBtnEl,
    getComponentSearchInputEl: options.panelControllerContext.getComponentSearchInputEl,
    getReactComponentListEl: options.panelControllerContext.getReactComponentListEl,
    onFetch: options.onFetch,
    onSelectElement: options.onSelectElement,
    onTogglePayloadMode: options.onTogglePayloadMode,
    onComponentSearchInput: options.onComponentSearchInput,
    clearPageHoverPreview: options.clearPageHoverPreview,
    addNavigatedListener: options.addNavigatedListener,
    onBeforeUnload: options.onPanelBeforeUnload,
    runInitialRefresh: options.runInitialRefresh,
  };
}

export type { CreatePanelControllerBootstrapBindingsOptions };
