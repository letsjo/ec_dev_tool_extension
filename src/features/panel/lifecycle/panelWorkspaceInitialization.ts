import type {
  WorkspaceLayoutManager,
  WorkspaceLayoutManagerElements,
} from '../workspace/manager';
import type { WorkspacePanelId } from '../workspacePanels';

interface CreatePanelWorkspaceInitializationOptions {
  getPanelWorkspaceEl: () => HTMLElement;
  getPanelContentEl: () => HTMLElement;
  getWorkspacePanelToggleBarEl: () => HTMLDivElement;
  getWorkspaceDockPreviewEl: () => HTMLDivElement;
  getWorkspacePanelElements: () => Map<WorkspacePanelId, HTMLDetailsElement>;
  createWorkspaceLayoutManager: (
    elements: WorkspaceLayoutManagerElements,
  ) => WorkspaceLayoutManager;
  initWheelScrollFallback: (rootEl: HTMLElement) => (() => void) | null;
  setWorkspaceLayoutManager: (manager: WorkspaceLayoutManager | null) => void;
  setDestroyWheelScrollFallback: (destroyer: (() => void) | null) => void;
}

/** workspace/wheel fallback 초기화 결선을 묶어 panel bootstrap 콜백을 단순화한다. */
export function createPanelWorkspaceInitialization(
  options: CreatePanelWorkspaceInitializationOptions,
) {
  function initializeWorkspaceLayout() {
    options.setWorkspaceLayoutManager(
      options.createWorkspaceLayoutManager({
        panelContentEl: options.getPanelContentEl(),
        workspacePanelToggleBarEl: options.getWorkspacePanelToggleBarEl(),
        workspaceDockPreviewEl: options.getWorkspaceDockPreviewEl(),
        workspacePanelElements: options.getWorkspacePanelElements(),
      }),
    );
  }

  function initializeWheelFallback() {
    options.setDestroyWheelScrollFallback(
      options.initWheelScrollFallback(options.getPanelWorkspaceEl()),
    );
  }

  return {
    initializeWorkspaceLayout,
    initializeWheelFallback,
  };
}
