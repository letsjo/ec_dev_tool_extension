import { WORKSPACE_PANEL_IDS, type WorkspacePanelId } from '../../workspacePanels';
import type { WorkspaceLayoutNode, WorkspacePanelState } from '../layout/layoutModel';
import {
  captureWorkspaceScrollSnapshots,
  restoreWorkspaceScrollSnapshots,
} from '../scrollSnapshot';
import {
  syncWorkspacePanelBodySizes,
  syncWorkspaceSplitCollapsedRows,
} from './panelSizing';
import {
  renderWorkspacePanelToggleBar,
  updateWorkspacePanelControlState,
} from '../toggleBar';
import { resetWorkspacePanelSplitClasses } from '../layout/layoutDom';
import { renderWorkspaceLayoutPipeline } from './renderPipeline';

interface CreateWorkspaceRenderFlowOptions {
  panelContentEl: HTMLElement;
  workspaceDockPreviewEl: HTMLDivElement;
  workspacePanelToggleBarEl: HTMLDivElement;
  workspacePanelElements: Map<WorkspacePanelId, HTMLDetailsElement>;
  getWorkspaceLayoutRoot: () => WorkspaceLayoutNode | null;
  getWorkspacePanelStateById: () => Map<WorkspacePanelId, WorkspacePanelState>;
  reconcileWorkspaceLayout: () => void;
}

/** workspace layout 렌더/패널 열림 토글 흐름을 조립한다. */
export function createWorkspaceRenderFlow(options: CreateWorkspaceRenderFlowOptions) {
  /** 레이아웃을 재구성하지 않고 패널 접기/펼치기 상태만 반영 */
  function toggleWorkspacePanelOpenState(panelId: WorkspacePanelId) {
    const panelEl = options.workspacePanelElements.get(panelId);
    if (!panelEl || panelEl.hidden) return;
    panelEl.open = !panelEl.open;
    updateWorkspacePanelControlState(options.workspacePanelElements, panelId);
    syncWorkspaceSplitCollapsedRows(options.panelContentEl);
    syncWorkspacePanelBodySizes(options.workspacePanelElements);
  }

  /**
   * 워크스페이스 레이아웃 렌더 파이프라인.
   * 1) 패널 가시 상태를 DOM에 먼저 반영한다.
   * 2) split 트리를 patch(재사용 우선)해서 DOM churn을 최소화한다.
   * 3) 접힘 높이/토글바/패널 body 사이즈/스크롤 위치를 후처리로 복원한다.
   */
  function renderWorkspaceLayout() {
    resetWorkspacePanelSplitClasses(options.workspacePanelElements);
    options.reconcileWorkspaceLayout();

    const workspacePanelStateById = options.getWorkspacePanelStateById();
    WORKSPACE_PANEL_IDS.forEach((panelId) => {
      const panelEl = options.workspacePanelElements.get(panelId);
      if (!panelEl) return;
      const state = workspacePanelStateById.get(panelId) ?? 'visible';
      panelEl.hidden = state !== 'visible';
      panelEl.dataset.panelState = state;
      updateWorkspacePanelControlState(options.workspacePanelElements, panelId);
    });

    const scrollSnapshots = captureWorkspaceScrollSnapshots(options.panelContentEl);
    const renderResult = renderWorkspaceLayoutPipeline({
      panelContentEl: options.panelContentEl,
      workspaceDockPreviewEl: options.workspaceDockPreviewEl,
      workspaceLayoutRoot: options.getWorkspaceLayoutRoot(),
      workspacePanelElements: options.workspacePanelElements,
    });

    if (renderResult.hasLayoutRoot) {
      syncWorkspaceSplitCollapsedRows(options.panelContentEl);
    }
    renderWorkspacePanelToggleBar(options.workspacePanelToggleBarEl, workspacePanelStateById);
    syncWorkspacePanelBodySizes(options.workspacePanelElements);
    restoreWorkspaceScrollSnapshots(scrollSnapshots);
  }

  return {
    renderWorkspaceLayout,
    toggleWorkspacePanelOpenState,
  };
}
