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
  let unbindWorkspaceInteractions: (() => void) | null = null;
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

  const panelInteractionHandlers = {
    onPanelDragStart: workspaceDragDropFlow.onWorkspacePanelDragStart,
    onPanelDragEnd: workspaceDragDropFlow.onWorkspacePanelDragEnd,
    onSummaryAction: workspaceActionHandlers.onWorkspaceSummaryAction,
    onSummaryClick: workspaceActionHandlers.onWorkspaceSummaryClick,
    onActionButtonMouseDown: workspaceActionHandlers.onWorkspaceActionButtonMouseDown,
    onActionButtonDragStart: workspaceActionHandlers.onWorkspaceActionButtonDragStart,
  };

  const containerInteractionHandlers = {
    onWorkspaceDragOver: workspaceDragDropFlow.onWorkspaceDragOver,
    onWorkspaceDrop: workspaceDragDropFlow.onWorkspaceDrop,
    onWorkspaceDragLeave: workspaceDragDropFlow.onWorkspaceDragLeave,
    onWorkspaceSplitResizePointerDown: workspaceResizeFlow.onWorkspaceSplitResizePointerDown,
    onWorkspaceSplitDividerDoubleClick: workspaceResizeFlow.onWorkspaceSplitDividerDoubleClick,
    onWorkspacePanelToggleButtonClick: workspaceActionHandlers.onWorkspacePanelToggleButtonClick,
  };

  /**
   * 워크스페이스 상호작용(드래그/리사이즈/토글/옵저버) 초기화 진입점.
   * 순서가 중요한 이유:
   * 1) restore로 상태 모델을 먼저 만든다.
   * 2) 패널별 이벤트를 바인딩한다.
   * 3) 컨테이너 레벨 이벤트를 바인딩한다.
   * 4) 마지막에 1회 렌더를 수행한다.
   */
  function initWorkspaceLayoutManager() {
    workspaceLayoutState.restoreWorkspaceState();

    unbindWorkspaceInteractions?.();
    unbindWorkspaceInteractions = bindWorkspaceInteractionBindings({
      panelContentEl,
      workspacePanelToggleBarEl,
      workspacePanelElements,
      panelHandlers: panelInteractionHandlers,
      containerHandlers: containerInteractionHandlers,
    });
    workspacePanelBodySizeObserver.start();
    renderWorkspaceLayout();
  }

  /** 워크스페이스 관련 이벤트/옵저버를 해제한다. */
  function destroy() {
    unbindWorkspaceInteractions?.();
    unbindWorkspaceInteractions = null;

    workspacePanelBodySizeObserver.stop();

    workspaceResizeFlow.stopWorkspaceSplitResize(false);
    hideWorkspaceDockPreview(workspaceDockPreviewEl);
    workspaceDragDropFlow.onWorkspacePanelDragEnd();
  }

  initWorkspaceLayoutManager();

  return {
    destroy,
  };
}
