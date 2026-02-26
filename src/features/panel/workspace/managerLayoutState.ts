import type {
  WorkspaceDropTarget,
  WorkspaceLayoutNode,
  WorkspaceNodePath,
  WorkspacePanelState,
} from './layout/layoutModel';
import {
  removePanelFromWorkspaceLayout as removePanelFromWorkspaceLayoutValue,
  updateWorkspaceSplitRatioByPath as updateWorkspaceSplitRatioByPathValue,
} from './layout/layoutModel';
import type { WorkspacePanelId } from '../workspacePanels';
import { applyWorkspaceDockDropToLayout as applyWorkspaceDockDropToLayoutValue } from './dockDropApply';
import { reconcileWorkspaceLayoutState as reconcileWorkspaceLayoutStateValue } from './layout/layoutReconcile';
import {
  persistWorkspaceStateSnapshot as persistWorkspaceStateSnapshotValue,
  restoreWorkspaceStateSnapshot as restoreWorkspaceStateSnapshotValue,
} from './statePersistence';

interface WorkspaceManagerLayoutStateDependencies {
  removePanelFromWorkspaceLayout: typeof removePanelFromWorkspaceLayoutValue;
  applyWorkspaceDockDropToLayout: typeof applyWorkspaceDockDropToLayoutValue;
  updateWorkspaceSplitRatioByPath: typeof updateWorkspaceSplitRatioByPathValue;
  reconcileWorkspaceLayoutState: typeof reconcileWorkspaceLayoutStateValue;
  persistWorkspaceStateSnapshot: typeof persistWorkspaceStateSnapshotValue;
  restoreWorkspaceStateSnapshot: typeof restoreWorkspaceStateSnapshotValue;
}

interface CreateWorkspaceManagerLayoutStateOptions {
  workspacePanelElements: Map<WorkspacePanelId, HTMLDetailsElement>;
  dependencies?: Partial<WorkspaceManagerLayoutStateDependencies>;
}

export interface WorkspaceManagerLayoutState {
  setRenderWorkspaceLayout: (renderWorkspaceLayout: () => void) => void;
  getWorkspaceLayoutRoot: () => WorkspaceLayoutNode | null;
  getWorkspacePanelStateById: () => Map<WorkspacePanelId, WorkspacePanelState>;
  reconcileWorkspaceLayout: () => void;
  restoreWorkspaceState: () => void;
  setWorkspacePanelState: (panelId: WorkspacePanelId, state: WorkspacePanelState) => void;
  applyWorkspaceDockDrop: (draggedPanelId: WorkspacePanelId, dropTarget: WorkspaceDropTarget) => void;
  persistWorkspaceSplitRatio: (splitPath: WorkspaceNodePath, ratio: number) => void;
}

function resolveWorkspaceManagerLayoutStateDependencies(
  overrides: Partial<WorkspaceManagerLayoutStateDependencies> | undefined,
): WorkspaceManagerLayoutStateDependencies {
  return {
    removePanelFromWorkspaceLayout:
      overrides?.removePanelFromWorkspaceLayout ?? removePanelFromWorkspaceLayoutValue,
    applyWorkspaceDockDropToLayout:
      overrides?.applyWorkspaceDockDropToLayout ?? applyWorkspaceDockDropToLayoutValue,
    updateWorkspaceSplitRatioByPath:
      overrides?.updateWorkspaceSplitRatioByPath ?? updateWorkspaceSplitRatioByPathValue,
    reconcileWorkspaceLayoutState:
      overrides?.reconcileWorkspaceLayoutState ?? reconcileWorkspaceLayoutStateValue,
    persistWorkspaceStateSnapshot:
      overrides?.persistWorkspaceStateSnapshot ?? persistWorkspaceStateSnapshotValue,
    restoreWorkspaceStateSnapshot:
      overrides?.restoreWorkspaceStateSnapshot ?? restoreWorkspaceStateSnapshotValue,
  };
}

/**
 * workspace layout mutable 상태(root/panel map)와 상태 전이 규칙을 묶는다.
 * manager는 이벤트 결선만 담당하고, 상태 변경/persist/render 시점은 이 모듈로 위임한다.
 */
export function createWorkspaceManagerLayoutState(
  options: CreateWorkspaceManagerLayoutStateOptions,
): WorkspaceManagerLayoutState {
  const dependencies = resolveWorkspaceManagerLayoutStateDependencies(options.dependencies);
  let workspaceLayoutRoot: WorkspaceLayoutNode | null = null;
  let workspacePanelStateById = new Map<WorkspacePanelId, WorkspacePanelState>();
  let renderWorkspaceLayout = () => {};

  function persistWorkspaceState() {
    dependencies.persistWorkspaceStateSnapshot(workspacePanelStateById, workspaceLayoutRoot);
  }

  function persistWorkspaceStateAndRender() {
    persistWorkspaceState();
    renderWorkspaceLayout();
  }

  return {
    setRenderWorkspaceLayout(nextRenderWorkspaceLayout) {
      renderWorkspaceLayout = nextRenderWorkspaceLayout;
    },
    getWorkspaceLayoutRoot: () => workspaceLayoutRoot,
    getWorkspacePanelStateById: () => workspacePanelStateById,
    reconcileWorkspaceLayout() {
      workspaceLayoutRoot = dependencies.reconcileWorkspaceLayoutState(
        workspaceLayoutRoot,
        workspacePanelStateById,
      );
    },
    restoreWorkspaceState() {
      const restored = dependencies.restoreWorkspaceStateSnapshot();
      workspacePanelStateById = restored.workspacePanelStateById;
      workspaceLayoutRoot = restored.workspaceLayoutRoot;
    },
    setWorkspacePanelState(panelId, state) {
      workspacePanelStateById.set(panelId, state);
      if (state === 'visible') {
        const panelEl = options.workspacePanelElements.get(panelId);
        if (panelEl) {
          panelEl.open = true;
        }
      } else {
        const removal = dependencies.removePanelFromWorkspaceLayout(workspaceLayoutRoot, panelId);
        workspaceLayoutRoot = removal.node;
      }
      persistWorkspaceStateAndRender();
    },
    applyWorkspaceDockDrop(draggedPanelId, dropTarget) {
      const nextLayout = dependencies.applyWorkspaceDockDropToLayout(
        workspaceLayoutRoot,
        draggedPanelId,
        dropTarget,
      );
      if (!nextLayout.changed) {
        return;
      }
      workspaceLayoutRoot = nextLayout.layoutRoot;
      persistWorkspaceStateAndRender();
    },
    persistWorkspaceSplitRatio(splitPath, ratio) {
      workspaceLayoutRoot = dependencies.updateWorkspaceSplitRatioByPath(
        workspaceLayoutRoot,
        splitPath,
        ratio,
      );
      persistWorkspaceState();
    },
  };
}
