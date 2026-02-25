import { isWorkspacePanelId, type WorkspacePanelId } from '../workspacePanels';
import {
  appendPanelToWorkspaceLayout,
  collectPanelIdsFromLayout,
  dedupeWorkspaceLayoutPanels,
  getWorkspaceVisiblePanelIds,
  parseWorkspaceNodePath,
  pruneWorkspaceLayoutByVisiblePanels,
  removePanelFromWorkspaceLayout,
  updateWorkspaceSplitRatioByPath,
  WORKSPACE_DOCK_SPLIT_RATIO,
  type WorkspaceDropTarget,
  type WorkspaceLayoutNode,
  type WorkspacePanelState,
} from './layoutModel';
import { applyWorkspaceDockDropToLayout } from './dockDropApply';
import {
  computeWorkspaceDockDirection,
  findWorkspacePanelByPoint,
  hideWorkspaceDockPreview,
  showWorkspaceDockPreview,
} from './dockPreview';
import {
  bindWorkspaceInteractionBindings,
} from './interactionBindings';
import { resolveWorkspaceDragOverTarget } from './dragOverTarget';
import { createWorkspaceDragDropFlow } from './dragDropFlow';
import { syncWorkspacePanelBodySizes } from './panelSizing';
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
import {
  persistWorkspaceStateSnapshot,
  restoreWorkspaceStateSnapshot,
} from './statePersistence';
import { createWorkspaceResizeFlow } from './resizeFlow';

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
  let workspaceLayoutRoot: WorkspaceLayoutNode | null = null;
  let workspacePanelStateById = new Map<WorkspacePanelId, WorkspacePanelState>();
  let workspacePanelBodySizeObserver: ResizeObserver | null = null;
  let unbindWorkspaceInteractions: (() => void) | null = null;

  /**
   * 현재 "보여야 하는 패널 집합"과 "레이아웃 트리"를 정합성 있게 맞춘다.
   * 1) 숨김 패널을 레이아웃에서 제거한다.
   * 2) 중복 패널 노드를 제거한다.
   * 3) visible인데 레이아웃에 없는 패널을 다시 append한다.
   */
  function reconcileWorkspaceLayout() {
    const visiblePanelIds = getWorkspaceVisiblePanelIds(workspacePanelStateById);
    const visiblePanelSet = new Set<WorkspacePanelId>(visiblePanelIds);
    workspaceLayoutRoot = dedupeWorkspaceLayoutPanels(
      pruneWorkspaceLayoutByVisiblePanels(workspaceLayoutRoot, visiblePanelSet),
    );
    visiblePanelIds.forEach((panelId) => {
      const idsInLayout = collectPanelIdsFromLayout(workspaceLayoutRoot);
      if (!idsInLayout.has(panelId)) {
        workspaceLayoutRoot = appendPanelToWorkspaceLayout(workspaceLayoutRoot, panelId);
      }
    });
  }

  const { renderWorkspaceLayout, toggleWorkspacePanelOpenState } = createWorkspaceRenderFlow({
    panelContentEl,
    workspaceDockPreviewEl,
    workspacePanelToggleBarEl,
    workspacePanelElements,
    getWorkspaceLayoutRoot: () => workspaceLayoutRoot,
    getWorkspacePanelStateById: () => workspacePanelStateById,
    reconcileWorkspaceLayout,
  });

  /** 초기화 */
  function initWorkspacePanelBodySizeObserver() {
    if (typeof ResizeObserver === 'undefined') return;
    if (workspacePanelBodySizeObserver) {
      workspacePanelBodySizeObserver.disconnect();
    }

    workspacePanelBodySizeObserver = new ResizeObserver(() => {
      syncWorkspacePanelBodySizes(workspacePanelElements);
    });
    workspacePanelBodySizeObserver.observe(panelContentEl);
    workspacePanelElements.forEach((panelEl) => {
      workspacePanelBodySizeObserver?.observe(panelEl);
    });
  }

  /**
   * 단일 패널의 가시 상태를 변경하고 레이아웃 트리에 반영한다.
   * `visible`로 전환할 때는 즉시 `open=true`로 강제해 body 높이 계산이 깨지지 않게 한다.
   */
  function setWorkspacePanelState(panelId: WorkspacePanelId, state: WorkspacePanelState) {
    workspacePanelStateById.set(panelId, state);
    if (state === 'visible') {
      const panelEl = workspacePanelElements.get(panelId);
      if (panelEl) {
        panelEl.open = true;
      }
    } else {
      const removal = removePanelFromWorkspaceLayout(workspaceLayoutRoot, panelId);
      workspaceLayoutRoot = removal.node;
    }
    persistWorkspaceStateSnapshot(workspacePanelStateById, workspaceLayoutRoot);
    renderWorkspaceLayout();
  }

  /** 해당 기능 흐름을 처리 */
  function applyWorkspaceDockDrop(draggedPanelId: WorkspacePanelId, dropTarget: WorkspaceDropTarget) {
    const nextLayout = applyWorkspaceDockDropToLayout(
      workspaceLayoutRoot,
      draggedPanelId,
      dropTarget,
    );
    if (!nextLayout.changed) {
      return;
    }
    workspaceLayoutRoot = nextLayout.layoutRoot;
    persistWorkspaceStateSnapshot(workspacePanelStateById, workspaceLayoutRoot);
    renderWorkspaceLayout();
  }
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
    applyWorkspaceDockDrop,
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
      workspaceLayoutRoot = updateWorkspaceSplitRatioByPath(workspaceLayoutRoot, splitPath, ratio);
      persistWorkspaceStateSnapshot(workspacePanelStateById, workspaceLayoutRoot);
    },
  });

  /** 이벤트를 처리 */
  function onWorkspaceSummaryAction(event: MouseEvent) {
    const target = event.target as HTMLElement | null;
    const actionButton = target?.closest<HTMLButtonElement>('.workspace-panel-action[data-panel-action]');
    if (!actionButton) return;

    const panelIdRaw = actionButton.dataset.panelTarget;
    if (!isWorkspacePanelId(panelIdRaw)) return;
    const action = actionButton.dataset.panelAction;
    event.preventDefault();
    event.stopPropagation();

    if (action === 'toggle') {
      toggleWorkspacePanelOpenState(panelIdRaw);
      return;
    }
    if (action === 'close') {
      setWorkspacePanelState(panelIdRaw, 'closed');
    }
  }

  /** 이벤트를 처리 */
  function onWorkspaceSummaryClick(event: MouseEvent) {
    const target = event.target as HTMLElement | null;
    const actionButton = target?.closest<HTMLButtonElement>('.workspace-panel-action[data-panel-action]');
    if (actionButton) return;
    event.preventDefault();
  }

  /** 이벤트를 처리 */
  function onWorkspacePanelToggleButtonClick(event: MouseEvent) {
    const target = event.target as HTMLElement | null;
    const button = target?.closest<HTMLButtonElement>('.workspace-toggle-btn[data-panel-toggle]');
    if (!button) return;
    const panelIdRaw = button.dataset.panelToggle;
    if (!isWorkspacePanelId(panelIdRaw)) return;
    const state = workspacePanelStateById.get(panelIdRaw) ?? 'visible';
    setWorkspacePanelState(panelIdRaw, state === 'visible' ? 'closed' : 'visible');
  }

  /** 이벤트를 처리 */
  function onWorkspaceActionButtonMouseDown(event: MouseEvent) {
    event.stopPropagation();
  }

  /** 이벤트를 처리 */
  function onWorkspaceActionButtonDragStart(event: DragEvent) {
    event.preventDefault();
  }

  const panelInteractionHandlers = {
    onPanelDragStart: workspaceDragDropFlow.onWorkspacePanelDragStart,
    onPanelDragEnd: workspaceDragDropFlow.onWorkspacePanelDragEnd,
    onSummaryAction: onWorkspaceSummaryAction,
    onSummaryClick: onWorkspaceSummaryClick,
    onActionButtonMouseDown: onWorkspaceActionButtonMouseDown,
    onActionButtonDragStart: onWorkspaceActionButtonDragStart,
  };

  const containerInteractionHandlers = {
    onWorkspaceDragOver: workspaceDragDropFlow.onWorkspaceDragOver,
    onWorkspaceDrop: workspaceDragDropFlow.onWorkspaceDrop,
    onWorkspaceDragLeave: workspaceDragDropFlow.onWorkspaceDragLeave,
    onWorkspaceSplitResizePointerDown: workspaceResizeFlow.onWorkspaceSplitResizePointerDown,
    onWorkspaceSplitDividerDoubleClick: workspaceResizeFlow.onWorkspaceSplitDividerDoubleClick,
    onWorkspacePanelToggleButtonClick,
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
    const restored = restoreWorkspaceStateSnapshot();
    workspacePanelStateById = restored.workspacePanelStateById;
    workspaceLayoutRoot = restored.workspaceLayoutRoot;

    unbindWorkspaceInteractions?.();
    unbindWorkspaceInteractions = bindWorkspaceInteractionBindings({
      panelContentEl,
      workspacePanelToggleBarEl,
      workspacePanelElements,
      panelHandlers: panelInteractionHandlers,
      containerHandlers: containerInteractionHandlers,
    });
    initWorkspacePanelBodySizeObserver();
    renderWorkspaceLayout();
  }

  /** 워크스페이스 관련 이벤트/옵저버를 해제한다. */
  function destroy() {
    unbindWorkspaceInteractions?.();
    unbindWorkspaceInteractions = null;

    if (workspacePanelBodySizeObserver) {
      workspacePanelBodySizeObserver.disconnect();
      workspacePanelBodySizeObserver = null;
    }

    workspaceResizeFlow.stopWorkspaceSplitResize(false);
    hideWorkspaceDockPreview(workspaceDockPreviewEl);
    workspaceDragDropFlow.onWorkspacePanelDragEnd();
  }

  initWorkspaceLayoutManager();

  return {
    destroy,
  };
}
