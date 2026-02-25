import type { WorkspaceNodePath } from "./layoutModel";
import type { WorkspaceResizeDragState } from "./splitResize";

interface CreateWorkspaceResizeFlowArgs {
  createWorkspaceResizeDragStateFromTarget: (target: EventTarget | null) => WorkspaceResizeDragState | null;
  startWorkspaceSplitResizeSession: (
    state: WorkspaceResizeDragState,
    handlers: {
      onPointerMove: (event: PointerEvent) => void;
      onPointerUp: () => void;
      onPointerCancel: () => void;
    },
  ) => void;
  stopWorkspaceSplitResizeSession: (
    state: WorkspaceResizeDragState,
    handlers: {
      onPointerMove: (event: PointerEvent) => void;
      onPointerUp: () => void;
      onPointerCancel: () => void;
    },
  ) => void;
  computeWorkspaceResizeRatioFromPointer: (
    state: WorkspaceResizeDragState,
    event: PointerEvent,
  ) => number | null;
  applyWorkspaceSplitRatioStyle: (splitEl: HTMLElement, ratio: number) => void;
  parseWorkspaceNodePath: (raw: string) => WorkspaceNodePath;
  defaultSplitRatio: number;
  onPersistSplitRatio: (splitPath: WorkspaceNodePath, ratio: number) => void;
}

/** split divider 포인터 리사이즈 상태와 이벤트 파이프라인을 관리한다. */
function createWorkspaceResizeFlow(args: CreateWorkspaceResizeFlowArgs) {
  const {
    createWorkspaceResizeDragStateFromTarget,
    startWorkspaceSplitResizeSession,
    stopWorkspaceSplitResizeSession,
    computeWorkspaceResizeRatioFromPointer,
    applyWorkspaceSplitRatioStyle,
    parseWorkspaceNodePath,
    defaultSplitRatio,
    onPersistSplitRatio,
  } = args;

  let workspaceResizeDragState: WorkspaceResizeDragState | null = null;

  function onWorkspaceSplitResizePointerMove(event: PointerEvent) {
    const state = workspaceResizeDragState;
    if (!state) return;
    const nextRatio = computeWorkspaceResizeRatioFromPointer(state, event);
    if (nextRatio === null) return;
    state.ratio = nextRatio;
    applyWorkspaceSplitRatioStyle(state.splitEl, nextRatio);
    event.preventDefault();
  }

  function stopWorkspaceSplitResize(shouldPersist: boolean) {
    const state = workspaceResizeDragState;
    if (!state) return;

    stopWorkspaceSplitResizeSession(state, {
      onPointerMove: onWorkspaceSplitResizePointerMove,
      onPointerUp: onWorkspaceSplitResizePointerUp,
      onPointerCancel: onWorkspaceSplitResizePointerCancel,
    });
    if (shouldPersist) {
      onPersistSplitRatio(state.splitPath, state.ratio);
    }
    workspaceResizeDragState = null;
  }

  function onWorkspaceSplitResizePointerUp() {
    stopWorkspaceSplitResize(true);
  }

  function onWorkspaceSplitResizePointerCancel() {
    stopWorkspaceSplitResize(false);
  }

  function onWorkspaceSplitResizePointerDown(event: PointerEvent) {
    if (event.button !== 0) return;
    const nextDragState = createWorkspaceResizeDragStateFromTarget(event.target);
    if (!nextDragState) return;
    workspaceResizeDragState = nextDragState;

    startWorkspaceSplitResizeSession(nextDragState, {
      onPointerMove: onWorkspaceSplitResizePointerMove,
      onPointerUp: onWorkspaceSplitResizePointerUp,
      onPointerCancel: onWorkspaceSplitResizePointerCancel,
    });
    event.preventDefault();
  }

  function onWorkspaceSplitDividerDoubleClick(event: MouseEvent) {
    const target = event.target as HTMLElement | null;
    const dividerEl = target?.closest<HTMLElement>(".workspace-split-divider");
    if (!dividerEl) return;

    const splitEl = dividerEl.parentElement;
    if (!(splitEl instanceof HTMLElement)) return;

    const splitPath = parseWorkspaceNodePath(splitEl.dataset.splitPath ?? "");
    applyWorkspaceSplitRatioStyle(splitEl, defaultSplitRatio);
    onPersistSplitRatio(splitPath, defaultSplitRatio);
    event.preventDefault();
  }

  return {
    onWorkspaceSplitResizePointerDown,
    onWorkspaceSplitResizePointerMove,
    onWorkspaceSplitResizePointerUp,
    onWorkspaceSplitResizePointerCancel,
    onWorkspaceSplitDividerDoubleClick,
    stopWorkspaceSplitResize,
  };
}

export { createWorkspaceResizeFlow };
