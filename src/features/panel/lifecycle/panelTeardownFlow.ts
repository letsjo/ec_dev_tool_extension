import type { WorkspaceLayoutManager } from '../workspace/manager';
import type { RuntimeRefreshScheduler } from '../runtimeRefresh/scheduler';

interface CreatePanelTeardownFlowOptions {
  getWorkspaceLayoutManager: () => WorkspaceLayoutManager | null;
  setWorkspaceLayoutManager: (manager: WorkspaceLayoutManager | null) => void;
  getDestroyWheelScrollFallback: () => (() => void) | null;
  setDestroyWheelScrollFallback: (destroyer: (() => void) | null) => void;
  runtimeRefreshScheduler: RuntimeRefreshScheduler;
  removeNavigatedListener: () => void;
}

/** 패널 언로드 시 workspace/runtime/nav listener 자원을 해제하는 teardown 함수를 구성한다. */
export function createPanelTeardownFlow(options: CreatePanelTeardownFlowOptions) {
  const {
    getWorkspaceLayoutManager,
    setWorkspaceLayoutManager,
    getDestroyWheelScrollFallback,
    setDestroyWheelScrollFallback,
    runtimeRefreshScheduler,
    removeNavigatedListener,
  } = options;

  return function onPanelBeforeUnload() {
    const workspaceLayoutManager = getWorkspaceLayoutManager();
    workspaceLayoutManager?.destroy();
    setWorkspaceLayoutManager(null);

    const destroyWheelScrollFallback = getDestroyWheelScrollFallback();
    if (destroyWheelScrollFallback) {
      destroyWheelScrollFallback();
      setDestroyWheelScrollFallback(null);
    }

    runtimeRefreshScheduler.dispose();
    removeNavigatedListener();
  };
}
