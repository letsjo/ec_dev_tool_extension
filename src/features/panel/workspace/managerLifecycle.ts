export interface WorkspaceManagerLifecycleDependencies {
  restoreWorkspaceState: () => void;
  bindWorkspaceInteractions: () => () => void;
  startWorkspacePanelBodySizeObserver: () => void;
  stopWorkspacePanelBodySizeObserver: () => void;
  renderWorkspaceLayout: () => void;
  stopWorkspaceSplitResize: (persist: boolean) => void;
  hideWorkspaceDockPreview: () => void;
  onWorkspacePanelDragEnd: () => void;
}

export interface WorkspaceManagerLifecycle {
  init: () => void;
  destroy: () => void;
}

/** workspace manager의 init/destroy 순서 제약을 단일 모듈로 유지한다. */
export function createWorkspaceManagerLifecycle(
  dependencies: WorkspaceManagerLifecycleDependencies,
): WorkspaceManagerLifecycle {
  let unbindWorkspaceInteractions: (() => void) | null = null;

  /**
   * 순서가 중요한 이유:
   * 1) restore로 상태 모델을 먼저 만든다.
   * 2) 패널/컨테이너 이벤트를 바인딩한다.
   * 3) 마지막에 observer + 1회 렌더를 수행한다.
   */
  function init() {
    dependencies.restoreWorkspaceState();

    unbindWorkspaceInteractions?.();
    unbindWorkspaceInteractions = dependencies.bindWorkspaceInteractions();

    dependencies.startWorkspacePanelBodySizeObserver();
    dependencies.renderWorkspaceLayout();
  }

  /** workspace 관련 이벤트/옵저버/drag session을 해제한다. */
  function destroy() {
    unbindWorkspaceInteractions?.();
    unbindWorkspaceInteractions = null;

    dependencies.stopWorkspacePanelBodySizeObserver();
    dependencies.stopWorkspaceSplitResize(false);
    dependencies.hideWorkspaceDockPreview();
    dependencies.onWorkspacePanelDragEnd();
  }

  return {
    init,
    destroy,
  };
}
