import type { WorkspacePanelId } from '../workspacePanels';
import {
  hideWorkspaceDockPreview,
} from './interaction/dockPreview';
import {
  bindWorkspaceInteractionBindings,
} from './interactionBindings';
import { syncWorkspacePanelBodySizes } from './render/panelSizing';
import { createWorkspacePanelBodySizeObserver } from './render/panelBodySizeObserver';
import { createWorkspaceRenderFlow } from './render/renderFlow';
import { createWorkspaceManagerLayoutState } from './state/managerLayoutState';
import { createWorkspaceManagerLifecycle } from './managerLifecycle';
import { createWorkspaceManagerInteractionFlowWiring } from './managerInteractionFlowWiring';

export interface WorkspaceLayoutManagerElements {
  panelContentEl: HTMLElement;
  workspacePanelToggleBarEl: HTMLDivElement;
  workspaceDockPreviewEl: HTMLDivElement;
  workspacePanelElements: Map<WorkspacePanelId, HTMLDetailsElement>;
}

export interface WorkspaceLayoutManager {
  destroy: () => void;
}

/**
 * 워크스페이스 레이아웃(토글/드래그/리사이즈/영속화) 상태머신.
 * controller는 이 매니저를 초기화/해제만 수행하고,
 * 상세 이벤트와 DOM patch 파이프라인은 여기서 단일 책임으로 관리한다.
 */
export function createWorkspaceLayoutManager({
  panelContentEl,
  workspacePanelToggleBarEl,
  workspaceDockPreviewEl,
  workspacePanelElements,
}: WorkspaceLayoutManagerElements): WorkspaceLayoutManager {
  const workspaceLayoutState = createWorkspaceManagerLayoutState({
    workspacePanelElements,
  });

  const { renderWorkspaceLayout, toggleWorkspacePanelOpenState } = createWorkspaceRenderFlow({
    panelContentEl,
    workspaceDockPreviewEl,
    workspacePanelToggleBarEl,
    workspacePanelElements,
    getWorkspaceLayoutRoot: workspaceLayoutState.getWorkspaceLayoutRoot,
    getWorkspacePanelStateById: workspaceLayoutState.getWorkspacePanelStateById,
    reconcileWorkspaceLayout: workspaceLayoutState.reconcileWorkspaceLayout,
  });
  workspaceLayoutState.setRenderWorkspaceLayout(renderWorkspaceLayout);

  const workspacePanelBodySizeObserver = createWorkspacePanelBodySizeObserver({
    panelContentEl,
    workspacePanelElements,
    onResize() {
      syncWorkspacePanelBodySizes(workspacePanelElements);
    },
  });
  const {
    panelHandlers,
    containerHandlers,
    stopWorkspaceSplitResize,
    onWorkspacePanelDragEnd,
  } = createWorkspaceManagerInteractionFlowWiring({
    panelContentEl,
    workspaceDockPreviewEl,
    workspacePanelElements,
    applyWorkspaceDockDrop: workspaceLayoutState.applyWorkspaceDockDrop,
    persistWorkspaceSplitRatio: workspaceLayoutState.persistWorkspaceSplitRatio,
    getWorkspacePanelStateById: workspaceLayoutState.getWorkspacePanelStateById,
    setWorkspacePanelState: workspaceLayoutState.setWorkspacePanelState,
    toggleWorkspacePanelOpenState,
  });
  const workspaceManagerLifecycle = createWorkspaceManagerLifecycle({
    restoreWorkspaceState() {
      workspaceLayoutState.restoreWorkspaceState();
    },
    bindWorkspaceInteractions() {
      return bindWorkspaceInteractionBindings({
        panelContentEl,
        workspacePanelToggleBarEl,
        workspacePanelElements,
        panelHandlers,
        containerHandlers,
      });
    },
    startWorkspacePanelBodySizeObserver() {
      workspacePanelBodySizeObserver.start();
    },
    stopWorkspacePanelBodySizeObserver() {
      workspacePanelBodySizeObserver.stop();
    },
    renderWorkspaceLayout() {
      renderWorkspaceLayout();
    },
    stopWorkspaceSplitResize(persist) {
      stopWorkspaceSplitResize(persist);
    },
    hideWorkspaceDockPreview() {
      hideWorkspaceDockPreview(workspaceDockPreviewEl);
    },
    onWorkspacePanelDragEnd() {
      onWorkspacePanelDragEnd();
    },
  });

  workspaceManagerLifecycle.init();

  return {
    destroy: workspaceManagerLifecycle.destroy,
  };
}
