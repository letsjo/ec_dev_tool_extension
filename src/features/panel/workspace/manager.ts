import { isWorkspacePanelId, type WorkspacePanelId } from '../workspacePanels';
import {
  parseWorkspaceNodePath,
  WORKSPACE_DOCK_SPLIT_RATIO,
} from './layoutModel';
import {
  computeWorkspaceDockDirection,
  findWorkspacePanelByPoint,
  hideWorkspaceDockPreview,
  showWorkspaceDockPreview,
} from './dockPreview';
import {
  bindWorkspaceInteractionBindings,
} from './interactionBindings';
import { createWorkspaceActionHandlers } from './actionHandlers';
import { createWorkspaceManagerInteractionHandlers } from './managerInteractionHandlers';
import { resolveWorkspaceDragOverTarget } from './dragOverTarget';
import { createWorkspaceDragDropFlow } from './dragDropFlow';
import { syncWorkspacePanelBodySizes } from './panelSizing';
import { createWorkspacePanelBodySizeObserver } from './panelBodySizeObserver';
import { createWorkspaceRenderFlow } from './renderFlow';
import {
  applyWorkspaceSplitRatioStyle,
  computeWorkspaceResizeRatioFromPointer,
  createWorkspaceResizeDragStateFromTarget,
} from './splitResize';
import {
  startWorkspaceSplitResizeSession,
  stopWorkspaceSplitResizeSession,
} from './splitResizeSession';
import { createWorkspaceResizeFlow } from './resizeFlow';
import { createWorkspaceManagerLayoutState } from './managerLayoutState';
import { createWorkspaceManagerLifecycle } from './managerLifecycle';

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

  const workspaceDragDropFlow = createWorkspaceDragDropFlow({
    panelContentEl,
    workspacePanelElements,
    isWorkspacePanelId,
    findWorkspacePanelByPoint: findWorkspacePanelByPoint,
    computeWorkspaceDockDirection: computeWorkspaceDockDirection,
    resolveWorkspaceDragOverTarget: resolveWorkspaceDragOverTarget,
    hideWorkspaceDockPreview() {
      hideWorkspaceDockPreview(workspaceDockPreviewEl);
    },
    showWorkspaceDockPreview(baseRect, direction) {
      showWorkspaceDockPreview(workspaceDockPreviewEl, panelContentEl, baseRect, direction);
    },
    applyWorkspaceDockDrop: workspaceLayoutState.applyWorkspaceDockDrop,
  });
  const workspaceResizeFlow = createWorkspaceResizeFlow({
    createWorkspaceResizeDragStateFromTarget: createWorkspaceResizeDragStateFromTarget,
    startWorkspaceSplitResizeSession: startWorkspaceSplitResizeSession,
    stopWorkspaceSplitResizeSession: stopWorkspaceSplitResizeSession,
    computeWorkspaceResizeRatioFromPointer: computeWorkspaceResizeRatioFromPointer,
    applyWorkspaceSplitRatioStyle: applyWorkspaceSplitRatioStyle,
    parseWorkspaceNodePath,
    defaultSplitRatio: WORKSPACE_DOCK_SPLIT_RATIO,
    onPersistSplitRatio(splitPath, ratio) {
      workspaceLayoutState.persistWorkspaceSplitRatio(splitPath, ratio);
    },
  });

  const workspaceActionHandlers = createWorkspaceActionHandlers({
    isWorkspacePanelId,
    getWorkspacePanelStateById: workspaceLayoutState.getWorkspacePanelStateById,
    toggleWorkspacePanelOpenState,
    setWorkspacePanelState: workspaceLayoutState.setWorkspacePanelState,
  });

  const { panelHandlers, containerHandlers } = createWorkspaceManagerInteractionHandlers({
    workspaceDragDropFlow,
    workspaceResizeFlow,
    workspaceActionHandlers,
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
      workspaceResizeFlow.stopWorkspaceSplitResize(persist);
    },
    hideWorkspaceDockPreview() {
      hideWorkspaceDockPreview(workspaceDockPreviewEl);
    },
    onWorkspacePanelDragEnd() {
      workspaceDragDropFlow.onWorkspacePanelDragEnd();
    },
  });

  workspaceManagerLifecycle.init();

  return {
    destroy: workspaceManagerLifecycle.destroy,
  };
}
