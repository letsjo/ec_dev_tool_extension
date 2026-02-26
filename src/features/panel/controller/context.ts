import type { PanelDomRefs } from '../domRefs';
import type { WorkspaceLayoutManager } from '../workspace/manager';
import type { WorkspacePanelId } from '../workspacePanels';

interface CreatePanelControllerContextOptions {
  initPanelDomRefs: () => PanelDomRefs;
}

export interface PanelControllerContext {
  initDomRefs: () => void;
  isPickerModeActive: () => boolean;
  setPickerModeActive: (active: boolean) => void;
  getOutputEl: () => HTMLDivElement;
  getTargetSelectEl: () => HTMLSelectElement | null;
  getFetchBtnEl: () => HTMLButtonElement | null;
  getSelectElementBtnEl: () => HTMLButtonElement;
  getComponentSearchInputEl: () => HTMLInputElement;
  getElementOutputEl: () => HTMLDivElement;
  getDomTreeStatusEl: () => HTMLDivElement;
  getDomTreeOutputEl: () => HTMLDivElement;
  getReactStatusEl: () => HTMLDivElement;
  getReactComponentListEl: () => HTMLDivElement;
  getTreePaneEl: () => HTMLDivElement;
  getReactComponentDetailEl: () => HTMLDivElement;
  getPanelWorkspaceEl: () => HTMLElement;
  getPanelContentEl: () => HTMLElement;
  getWorkspacePanelToggleBarEl: () => HTMLDivElement;
  getWorkspaceDockPreviewEl: () => HTMLDivElement;
  getWorkspacePanelElements: () => Map<WorkspacePanelId, HTMLDetailsElement>;
  getWorkspaceLayoutManager: () => WorkspaceLayoutManager | null;
  setWorkspaceLayoutManager: (manager: WorkspaceLayoutManager | null) => void;
  getDestroyWheelScrollFallback: () => (() => void) | null;
  setDestroyWheelScrollFallback: (destroyer: (() => void) | null) => void;
  getRemoveRuntimeMessageListener: () => (() => void) | null;
  setRemoveRuntimeMessageListener: (removeListener: (() => void) | null) => void;
}

function requireDomRefs(domRefs: PanelDomRefs | null): PanelDomRefs {
  if (domRefs) {
    return domRefs;
  }
  throw new Error('[EC Dev Tool] Panel DOM refs are not initialized yet.');
}

/** controller 전역 mutable 상태(DOM ref + lifecycle handle)를 한 곳에서 관리한다. */
export function createPanelControllerContext(
  options: CreatePanelControllerContextOptions,
): PanelControllerContext {
  let domRefs: PanelDomRefs | null = null;
  let pickerModeActive = false;
  let workspaceLayoutManager: WorkspaceLayoutManager | null = null;
  let destroyWheelScrollFallback: (() => void) | null = null;
  let removeRuntimeMessageListener: (() => void) | null = null;

  return {
    initDomRefs() {
      domRefs = options.initPanelDomRefs();
    },
    isPickerModeActive: () => pickerModeActive,
    setPickerModeActive(active) {
      pickerModeActive = active;
      const selectElementBtnEl = requireDomRefs(domRefs).selectElementBtnEl;
      selectElementBtnEl.classList.toggle('active', active);
      selectElementBtnEl.setAttribute('aria-pressed', active ? 'true' : 'false');
      selectElementBtnEl.title = active ? '요소 선택 중 (Esc로 취소)' : '요소 선택 모드 시작';
    },
    getOutputEl: () => requireDomRefs(domRefs).outputEl,
    getTargetSelectEl: () => requireDomRefs(domRefs).targetSelectEl,
    getFetchBtnEl: () => requireDomRefs(domRefs).fetchBtnEl,
    getSelectElementBtnEl: () => requireDomRefs(domRefs).selectElementBtnEl,
    getComponentSearchInputEl: () => requireDomRefs(domRefs).componentSearchInputEl,
    getElementOutputEl: () => requireDomRefs(domRefs).elementOutputEl,
    getDomTreeStatusEl: () => requireDomRefs(domRefs).domTreeStatusEl,
    getDomTreeOutputEl: () => requireDomRefs(domRefs).domTreeOutputEl,
    getReactStatusEl: () => requireDomRefs(domRefs).reactStatusEl,
    getReactComponentListEl: () => requireDomRefs(domRefs).reactComponentListEl,
    getTreePaneEl: () => requireDomRefs(domRefs).treePaneEl,
    getReactComponentDetailEl: () => requireDomRefs(domRefs).reactComponentDetailEl,
    getPanelWorkspaceEl: () => requireDomRefs(domRefs).panelWorkspaceEl,
    getPanelContentEl: () => requireDomRefs(domRefs).panelContentEl,
    getWorkspacePanelToggleBarEl: () => requireDomRefs(domRefs).workspacePanelToggleBarEl,
    getWorkspaceDockPreviewEl: () => requireDomRefs(domRefs).workspaceDockPreviewEl,
    getWorkspacePanelElements: () => requireDomRefs(domRefs).workspacePanelElements,
    getWorkspaceLayoutManager: () => workspaceLayoutManager,
    setWorkspaceLayoutManager(manager) {
      workspaceLayoutManager = manager;
    },
    getDestroyWheelScrollFallback: () => destroyWheelScrollFallback,
    setDestroyWheelScrollFallback(destroyer) {
      destroyWheelScrollFallback = destroyer;
    },
    getRemoveRuntimeMessageListener: () => removeRuntimeMessageListener,
    setRemoveRuntimeMessageListener(removeListener) {
      removeRuntimeMessageListener = removeListener;
    },
  };
}
