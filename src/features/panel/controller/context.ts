import type { PanelDomRefs } from '../domRefs';
import type { WorkspaceLayoutManager } from '../workspace/manager';
import type { WorkspacePanelId } from '../workspacePanels';
import type { ReactPayloadMode } from '../reactInspector/fetchOptions';

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
  getPayloadModeBtnEl: () => HTMLButtonElement;
  getReactPayloadMode: () => ReactPayloadMode;
  setReactPayloadMode: (mode: ReactPayloadMode) => void;
  getElementOutputEl: () => HTMLDivElement;
  getDomTreeStatusEl: () => HTMLDivElement;
  getDomTreeOutputEl: () => HTMLDivElement;
  getReactStatusEl: () => HTMLDivElement;
  getReactComponentListEl: () => HTMLDivElement;
  getTreePaneEl: () => HTMLDivElement;
  getReactComponentDetailEl: () => HTMLDivElement;
  getDebugDiagnosticsPaneEl: () => HTMLDivElement;
  getDebugLogPaneEl: () => HTMLDivElement;
  getDebugLogCopyBtnEl: () => HTMLButtonElement;
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
  let reactPayloadMode: ReactPayloadMode = 'lite';
  let workspaceLayoutManager: WorkspaceLayoutManager | null = null;
  let destroyWheelScrollFallback: (() => void) | null = null;
  let removeRuntimeMessageListener: (() => void) | null = null;

  function applyPayloadModeButtonState() {
    const payloadModeBtnEl = requireDomRefs(domRefs).payloadModeBtnEl;
    const isFull = reactPayloadMode === 'full';
    payloadModeBtnEl.textContent = isFull ? 'Full' : 'Lite';
    payloadModeBtnEl.classList.toggle('active', isFull);
    payloadModeBtnEl.setAttribute('aria-pressed', isFull ? 'true' : 'false');
    payloadModeBtnEl.title = isFull
      ? 'Payload mode: Full (상세 데이터 우선)'
      : 'Payload mode: Lite (빠른 조회)';
  }

  return {
    initDomRefs() {
      domRefs = options.initPanelDomRefs();
      applyPayloadModeButtonState();
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
    getPayloadModeBtnEl: () => requireDomRefs(domRefs).payloadModeBtnEl,
    getReactPayloadMode: () => reactPayloadMode,
    setReactPayloadMode(mode) {
      reactPayloadMode = mode;
      applyPayloadModeButtonState();
    },
    getElementOutputEl: () => requireDomRefs(domRefs).elementOutputEl,
    getDomTreeStatusEl: () => requireDomRefs(domRefs).domTreeStatusEl,
    getDomTreeOutputEl: () => requireDomRefs(domRefs).domTreeOutputEl,
    getReactStatusEl: () => requireDomRefs(domRefs).reactStatusEl,
    getReactComponentListEl: () => requireDomRefs(domRefs).reactComponentListEl,
    getTreePaneEl: () => requireDomRefs(domRefs).treePaneEl,
    getReactComponentDetailEl: () => requireDomRefs(domRefs).reactComponentDetailEl,
    getDebugDiagnosticsPaneEl: () => requireDomRefs(domRefs).debugDiagnosticsPaneEl,
    getDebugLogPaneEl: () => requireDomRefs(domRefs).debugLogPaneEl,
    getDebugLogCopyBtnEl: () => requireDomRefs(domRefs).debugLogCopyBtnEl,
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
