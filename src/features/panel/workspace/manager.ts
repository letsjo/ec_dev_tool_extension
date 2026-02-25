import { isWorkspacePanelId, WORKSPACE_PANEL_IDS, type WorkspacePanelId } from '../workspacePanels';
import {
  appendPanelToWorkspaceLayout,
  collectPanelIdsFromLayout,
  createDefaultWorkspaceLayout,
  dedupeWorkspaceLayoutPanels,
  getWorkspaceVisiblePanelIds,
  parseWorkspaceLayoutNode,
  parseWorkspaceNodePath,
  pruneWorkspaceLayoutByVisiblePanels,
  removePanelFromWorkspaceLayout,
  updateWorkspaceSplitRatioByPath,
  WORKSPACE_DOCK_SPLIT_RATIO,
  type WorkspaceDockDirection,
  type WorkspaceDropTarget,
  type WorkspaceLayoutNode,
  type WorkspacePanelState,
} from './layoutModel';
import { applyWorkspaceDockDropToLayout as applyWorkspaceDockDropToLayoutValue } from './dockDropApply';
import {
  computeWorkspaceDockDirection as computeWorkspaceDockDirectionValue,
  findWorkspacePanelByPoint as findWorkspacePanelByPointValue,
  hideWorkspaceDockPreview as hideWorkspaceDockPreviewValue,
  showWorkspaceDockPreview as showWorkspaceDockPreviewValue,
} from './dockPreview';
import {
  getWorkspaceLayoutRootElement as getWorkspaceLayoutRootElementValue,
} from './domReuse';
import {
  captureWorkspaceScrollSnapshots as captureWorkspaceScrollSnapshotsValue,
  restoreWorkspaceScrollSnapshots as restoreWorkspaceScrollSnapshotsValue,
} from './scrollSnapshot';
import {
  syncWorkspacePanelBodySizes as syncWorkspacePanelBodySizesValue,
  syncWorkspaceSplitCollapsedRows as syncWorkspaceSplitCollapsedRowsValue,
} from './panelSizing';
import {
  bindWorkspacePanelInteractions as bindWorkspacePanelInteractionsValue,
  unbindWorkspacePanelInteractions as unbindWorkspacePanelInteractionsValue,
} from './panelBindings';
import {
  bindWorkspaceContainerInteractions as bindWorkspaceContainerInteractionsValue,
  unbindWorkspaceContainerInteractions as unbindWorkspaceContainerInteractionsValue,
} from './containerBindings';
import { resolveWorkspaceDragOverTarget as resolveWorkspaceDragOverTargetValue } from './dragOverTarget';
import { createWorkspaceDragDropFlow as createWorkspaceDragDropFlowValue } from './dragDropFlow';
import {
  renderWorkspacePanelToggleBar as renderWorkspacePanelToggleBarValue,
  updateWorkspacePanelControlState as updateWorkspacePanelControlStateValue,
} from './toggleBar';
import {
  resetWorkspacePanelSplitClasses as resetWorkspacePanelSplitClassesValue,
} from './layoutDom';
import { patchWorkspaceLayoutDomNode as patchWorkspaceLayoutDomNodeValue } from './domPatcher';
import {
  applyWorkspaceSplitRatioStyle as applyWorkspaceSplitRatioStyleValue,
  computeWorkspaceResizeRatioFromPointer as computeWorkspaceResizeRatioFromPointerValue,
  createWorkspaceResizeDragStateFromTarget as createWorkspaceResizeDragStateFromTargetValue,
  type WorkspaceResizeDragState,
} from './splitResize';
import {
  startWorkspaceSplitResizeSession as startWorkspaceSplitResizeSessionValue,
  stopWorkspaceSplitResizeSession as stopWorkspaceSplitResizeSessionValue,
} from './splitResizeSession';
import {
  persistWorkspaceStateSnapshot as persistWorkspaceStateSnapshotValue,
  restoreWorkspaceStateSnapshot as restoreWorkspaceStateSnapshotValue,
} from './statePersistence';

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
  let workspaceResizeDragState: WorkspaceResizeDragState | null = null;
  let workspacePanelBodySizeObserver: ResizeObserver | null = null;

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

  /**
   * 워크스페이스 UI 상태를 localStorage에 영속화한다.
   * - 패널 가시 상태 맵
   * - split/panel 트리 레이아웃
   */
  function persistWorkspaceState() {
    persistWorkspaceStateSnapshotValue(workspacePanelStateById, workspaceLayoutRoot);
  }

  /**
   * localStorage의 워크스페이스 상태를 복원한다.
   * 과거 버전의 `minimized` 값은 현재 모델(`visible|closed`)로 안전 변환한다.
   */
  function restoreWorkspaceState() {
    const restored = restoreWorkspaceStateSnapshotValue();
    workspacePanelStateById = restored.workspacePanelStateById;
    workspaceLayoutRoot = restored.workspaceLayoutRoot;
  }

  /** 화면 요소를 렌더링 */
  const renderWorkspacePanelToggleBar = () =>
    renderWorkspacePanelToggleBarValue(workspacePanelToggleBarEl, workspacePanelStateById);

  /** UI 상태 또는 문구를 설정 */
  const updateWorkspacePanelControlState = (panelId: WorkspacePanelId) =>
    updateWorkspacePanelControlStateValue(workspacePanelElements, panelId);

  /** 레이아웃/상태를 동기화 */
  function syncWorkspaceSplitCollapsedRows() {
    syncWorkspaceSplitCollapsedRowsValue(panelContentEl);
  }

  /** 현재 워크스페이스 내 스크롤 위치를 캡처 */
  function captureWorkspaceScrollSnapshots() {
    return captureWorkspaceScrollSnapshotsValue(panelContentEl);
  }

  /** 캡처한 스크롤 위치를 복원 */
  function restoreWorkspaceScrollSnapshots(
    snapshots: ReturnType<typeof captureWorkspaceScrollSnapshots>,
  ) {
    restoreWorkspaceScrollSnapshotsValue(snapshots);
  }

  /** 현재 workspace 루트 DOM 노드를 반환 */
  function getWorkspaceLayoutRootElement(): HTMLElement | null {
    return getWorkspaceLayoutRootElementValue(panelContentEl, workspaceDockPreviewEl);
  }

  /** 레이아웃을 재구성하지 않고 패널 접기/펼치기 상태만 반영 */
  function toggleWorkspacePanelOpenState(panelId: WorkspacePanelId) {
    const panelEl = workspacePanelElements.get(panelId);
    if (!panelEl || panelEl.hidden) return;
    panelEl.open = !panelEl.open;
    updateWorkspacePanelControlState(panelId);
    syncWorkspaceSplitCollapsedRows();
    syncWorkspacePanelBodySizes();
  }

  /** 레이아웃/상태를 동기화 */
  function syncWorkspacePanelBodySizes() {
    syncWorkspacePanelBodySizesValue(workspacePanelElements);
  }

  /** 초기화 */
  function initWorkspacePanelBodySizeObserver() {
    if (typeof ResizeObserver === 'undefined') return;
    if (workspacePanelBodySizeObserver) {
      workspacePanelBodySizeObserver.disconnect();
    }

    workspacePanelBodySizeObserver = new ResizeObserver(() => {
      syncWorkspacePanelBodySizes();
    });
    workspacePanelBodySizeObserver.observe(panelContentEl);
    workspacePanelElements.forEach((panelEl) => {
      workspacePanelBodySizeObserver?.observe(panelEl);
    });
  }

  /** 화면 요소를 렌더링 */
  function hideWorkspaceDockPreview() {
    hideWorkspaceDockPreviewValue(workspaceDockPreviewEl);
  }

  /** 화면 요소를 렌더링 */
  function showWorkspaceDockPreview(baseRect: DOMRect, direction: WorkspaceDockDirection) {
    showWorkspaceDockPreviewValue(workspaceDockPreviewEl, panelContentEl, baseRect, direction);
  }

  /**
   * 워크스페이스 레이아웃 렌더 파이프라인.
   * 1) 패널 가시 상태를 DOM에 먼저 반영한다.
   * 2) split 트리를 patch(재사용 우선)해서 DOM churn을 최소화한다.
   * 3) 접힘 높이/토글바/패널 body 사이즈/스크롤 위치를 후처리로 복원한다.
   */
  function renderWorkspaceLayout() {
    resetWorkspacePanelSplitClassesValue(workspacePanelElements);
    reconcileWorkspaceLayout();

    WORKSPACE_PANEL_IDS.forEach((panelId) => {
      const panelEl = workspacePanelElements.get(panelId);
      if (!panelEl) return;
      const state = workspacePanelStateById.get(panelId) ?? 'visible';
      panelEl.hidden = state !== 'visible';
      panelEl.dataset.panelState = state;
      updateWorkspacePanelControlState(panelId);
    });

    if (workspaceDockPreviewEl.parentElement !== panelContentEl) {
      panelContentEl.appendChild(workspaceDockPreviewEl);
    }
    if (panelContentEl.firstElementChild !== workspaceDockPreviewEl) {
      panelContentEl.insertBefore(workspaceDockPreviewEl, panelContentEl.firstChild);
    }
    hideWorkspaceDockPreview();

    const scrollSnapshots = captureWorkspaceScrollSnapshots();
    const existingRoot = getWorkspaceLayoutRootElement();
    let nextRoot: HTMLElement;
    if (workspaceLayoutRoot) {
      nextRoot = patchWorkspaceLayoutDomNodeValue({
        layoutNode: workspaceLayoutRoot,
        existingRoot,
        workspacePanelElements,
      });
    } else if (existingRoot && existingRoot.classList.contains('workspace-empty')) {
      nextRoot = existingRoot;
    } else {
      const empty = document.createElement('div');
      empty.className = 'workspace-empty';
      empty.textContent = '표시 중인 패널이 없습니다. 하단 footer에서 패널을 다시 켜주세요.';
      nextRoot = empty;
    }

    if (nextRoot.parentElement !== panelContentEl) {
      panelContentEl.insertBefore(nextRoot, workspaceDockPreviewEl.nextSibling);
    } else if (workspaceDockPreviewEl.nextSibling !== nextRoot) {
      panelContentEl.insertBefore(nextRoot, workspaceDockPreviewEl.nextSibling);
    }

    Array.from(panelContentEl.children).forEach((child) => {
      if (child !== workspaceDockPreviewEl && child !== nextRoot) {
        panelContentEl.removeChild(child);
      }
    });

    if (workspaceLayoutRoot) {
      syncWorkspaceSplitCollapsedRows();
    }
    renderWorkspacePanelToggleBar();
    syncWorkspacePanelBodySizes();
    restoreWorkspaceScrollSnapshots(scrollSnapshots);
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
    persistWorkspaceState();
    renderWorkspaceLayout();
  }

  /** 조건에 맞는 대상을 탐색 */
  function findWorkspacePanelByPoint(clientX: number, clientY: number): HTMLDetailsElement | null {
    return findWorkspacePanelByPointValue(clientX, clientY);
  }

  /** 필요한 값/상태를 계산해 반환 */
  function computeWorkspaceDockDirection(
    panelEl: HTMLElement,
    clientX: number,
    clientY: number,
  ): WorkspaceDockDirection {
    return computeWorkspaceDockDirectionValue(panelEl, clientX, clientY);
  }

  /** 해당 기능 흐름을 처리 */
  function applyWorkspaceDockDrop(draggedPanelId: WorkspacePanelId, dropTarget: WorkspaceDropTarget) {
    const nextLayout = applyWorkspaceDockDropToLayoutValue(
      workspaceLayoutRoot,
      draggedPanelId,
      dropTarget,
    );
    if (!nextLayout.changed) {
      return;
    }
    workspaceLayoutRoot = nextLayout.layoutRoot;
    persistWorkspaceState();
    renderWorkspaceLayout();
  }
  const workspaceDragDropFlow = createWorkspaceDragDropFlowValue({
    panelContentEl,
    workspacePanelElements,
    isWorkspacePanelId,
    findWorkspacePanelByPoint,
    computeWorkspaceDockDirection,
    resolveWorkspaceDragOverTarget: resolveWorkspaceDragOverTargetValue,
    hideWorkspaceDockPreview,
    showWorkspaceDockPreview,
    applyWorkspaceDockDrop,
  });

  /** 이벤트를 처리 */
  function onWorkspaceSplitResizePointerMove(event: PointerEvent) {
    const state = workspaceResizeDragState;
    if (!state) return;
    const nextRatio = computeWorkspaceResizeRatioFromPointerValue(state, event);
    if (nextRatio === null) return;
    state.ratio = nextRatio;
    applyWorkspaceSplitRatioStyleValue(state.splitEl, nextRatio);
    event.preventDefault();
  }

  /** 해당 기능 흐름을 처리 */
  function stopWorkspaceSplitResize(shouldPersist: boolean) {
    const state = workspaceResizeDragState;
    if (!state) return;

    stopWorkspaceSplitResizeSessionValue(state, {
      onPointerMove: onWorkspaceSplitResizePointerMove,
      onPointerUp: onWorkspaceSplitResizePointerUp,
      onPointerCancel: onWorkspaceSplitResizePointerCancel,
    });

    if (shouldPersist) {
      workspaceLayoutRoot = updateWorkspaceSplitRatioByPath(
        workspaceLayoutRoot,
        state.splitPath,
        state.ratio,
      );
      persistWorkspaceState();
    }
    workspaceResizeDragState = null;
  }

  /** 이벤트를 처리 */
  function onWorkspaceSplitResizePointerUp() {
    stopWorkspaceSplitResize(true);
  }

  /** 이벤트를 처리 */
  function onWorkspaceSplitResizePointerCancel() {
    stopWorkspaceSplitResize(false);
  }

  /** 이벤트를 처리 */
  function onWorkspaceSplitResizePointerDown(event: PointerEvent) {
    if (event.button !== 0) return;
    const nextDragState = createWorkspaceResizeDragStateFromTargetValue(event.target);
    if (!nextDragState) return;
    workspaceResizeDragState = nextDragState;

    startWorkspaceSplitResizeSessionValue(nextDragState, {
      onPointerMove: onWorkspaceSplitResizePointerMove,
      onPointerUp: onWorkspaceSplitResizePointerUp,
      onPointerCancel: onWorkspaceSplitResizePointerCancel,
    });
    event.preventDefault();
  }

  /** 이벤트를 처리 */
  function onWorkspaceSplitDividerDoubleClick(event: MouseEvent) {
    const target = event.target as HTMLElement | null;
    const dividerEl = target?.closest<HTMLElement>('.workspace-split-divider');
    if (!dividerEl) return;

    const splitEl = dividerEl.parentElement;
    if (!(splitEl instanceof HTMLElement)) return;

    const splitPath = parseWorkspaceNodePath(splitEl.dataset.splitPath ?? '');
    const nextRatio = WORKSPACE_DOCK_SPLIT_RATIO;

    applyWorkspaceSplitRatioStyleValue(splitEl, nextRatio);
    workspaceLayoutRoot = updateWorkspaceSplitRatioByPath(workspaceLayoutRoot, splitPath, nextRatio);
    persistWorkspaceState();
    event.preventDefault();
  }

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

  /**
   * 워크스페이스 상호작용(드래그/리사이즈/토글/옵저버) 초기화 진입점.
   * 순서가 중요한 이유:
   * 1) restore로 상태 모델을 먼저 만든다.
   * 2) 패널별 이벤트를 바인딩한다.
   * 3) 컨테이너 레벨 이벤트를 바인딩한다.
   * 4) 마지막에 1회 렌더를 수행한다.
   */
  function initWorkspaceLayoutManager() {
    restoreWorkspaceState();

    bindWorkspacePanelInteractionsValue(workspacePanelElements, {
      onPanelDragStart: workspaceDragDropFlow.onWorkspacePanelDragStart,
      onPanelDragEnd: workspaceDragDropFlow.onWorkspacePanelDragEnd,
      onSummaryAction: onWorkspaceSummaryAction,
      onSummaryClick: onWorkspaceSummaryClick,
      onActionButtonMouseDown: onWorkspaceActionButtonMouseDown,
      onActionButtonDragStart: onWorkspaceActionButtonDragStart,
    });

    bindWorkspaceContainerInteractionsValue(panelContentEl, workspacePanelToggleBarEl, {
      onWorkspaceDragOver: workspaceDragDropFlow.onWorkspaceDragOver,
      onWorkspaceDrop: workspaceDragDropFlow.onWorkspaceDrop,
      onWorkspaceDragLeave: workspaceDragDropFlow.onWorkspaceDragLeave,
      onWorkspaceSplitResizePointerDown,
      onWorkspaceSplitDividerDoubleClick,
      onWorkspacePanelToggleButtonClick,
    });
    initWorkspacePanelBodySizeObserver();
    renderWorkspaceLayout();
  }

  /** 워크스페이스 관련 이벤트/옵저버를 해제한다. */
  function destroy() {
    unbindWorkspaceContainerInteractionsValue(panelContentEl, workspacePanelToggleBarEl, {
      onWorkspaceDragOver: workspaceDragDropFlow.onWorkspaceDragOver,
      onWorkspaceDrop: workspaceDragDropFlow.onWorkspaceDrop,
      onWorkspaceDragLeave: workspaceDragDropFlow.onWorkspaceDragLeave,
      onWorkspaceSplitResizePointerDown,
      onWorkspaceSplitDividerDoubleClick,
      onWorkspacePanelToggleButtonClick,
    });

    unbindWorkspacePanelInteractionsValue(workspacePanelElements, {
      onPanelDragStart: workspaceDragDropFlow.onWorkspacePanelDragStart,
      onPanelDragEnd: workspaceDragDropFlow.onWorkspacePanelDragEnd,
      onSummaryAction: onWorkspaceSummaryAction,
      onSummaryClick: onWorkspaceSummaryClick,
      onActionButtonMouseDown: onWorkspaceActionButtonMouseDown,
      onActionButtonDragStart: onWorkspaceActionButtonDragStart,
    });

    if (workspacePanelBodySizeObserver) {
      workspacePanelBodySizeObserver.disconnect();
      workspacePanelBodySizeObserver = null;
    }

    stopWorkspaceSplitResize(false);
    hideWorkspaceDockPreview();
    workspaceDragDropFlow.onWorkspacePanelDragEnd();
  }

  initWorkspaceLayoutManager();

  return {
    destroy,
  };
}
