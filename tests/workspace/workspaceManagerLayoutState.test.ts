import { describe, expect, it, vi } from 'vitest';
import type {
  WorkspaceDropTarget,
  WorkspaceLayoutNode,
  WorkspaceNodePath,
  WorkspacePanelState,
} from '../../src/features/panel/workspace/layout/layoutModel';
import { createWorkspaceManagerLayoutState } from '../../src/features/panel/workspace/managerLayoutState';
import type { WorkspacePanelId } from '../../src/features/panel/workspacePanels';

function createPanelNode(panelId: WorkspacePanelId): WorkspaceLayoutNode {
  return { type: 'panel', panelId };
}

function createDropTarget(
  direction: WorkspaceDropTarget['direction'] = 'center',
): WorkspaceDropTarget {
  return {
    targetPanelId: null,
    direction,
  };
}

function createHarness(overrides?: {
  removePanelFromWorkspaceLayout?: (
    node: WorkspaceLayoutNode | null,
    panelId: WorkspacePanelId,
  ) => { node: WorkspaceLayoutNode | null; removed: boolean };
  applyWorkspaceDockDropToLayout?: (
    layoutRoot: WorkspaceLayoutNode | null,
    draggedPanelId: WorkspacePanelId,
    dropTarget: WorkspaceDropTarget,
  ) => { layoutRoot: WorkspaceLayoutNode; changed: boolean };
  updateWorkspaceSplitRatioByPath?: (
    root: WorkspaceLayoutNode | null,
    splitPath: WorkspaceNodePath,
    ratio: number,
  ) => WorkspaceLayoutNode | null;
  reconcileWorkspaceLayoutState?: (
    root: WorkspaceLayoutNode | null,
    panelStateById: Map<WorkspacePanelId, WorkspacePanelState>,
  ) => WorkspaceLayoutNode | null;
  restoreWorkspaceStateSnapshot?: () => {
    workspacePanelStateById: Map<WorkspacePanelId, WorkspacePanelState>;
    workspaceLayoutRoot: WorkspaceLayoutNode | null;
  };
}) {
  const panelEl = document.createElement('details');
  const workspacePanelElements = new Map<WorkspacePanelId, HTMLDetailsElement>([
    ['componentsTreeSection', panelEl],
  ]);

  const removePanelFromWorkspaceLayout =
    overrides?.removePanelFromWorkspaceLayout ??
    vi.fn((node: WorkspaceLayoutNode | null) => ({ node, removed: false }));
  const applyWorkspaceDockDropToLayout =
    overrides?.applyWorkspaceDockDropToLayout ??
    vi.fn((layoutRoot: WorkspaceLayoutNode | null) => ({
      layoutRoot: layoutRoot ?? createPanelNode('componentsTreeSection'),
      changed: false,
    }));
  const updateWorkspaceSplitRatioByPath =
    overrides?.updateWorkspaceSplitRatioByPath ??
    vi.fn((root: WorkspaceLayoutNode | null) => root);
  const reconcileWorkspaceLayoutState =
    overrides?.reconcileWorkspaceLayoutState ??
    vi.fn((root: WorkspaceLayoutNode | null) => root);
  const persistWorkspaceStateSnapshot = vi.fn();
  const restoreWorkspaceStateSnapshot =
    overrides?.restoreWorkspaceStateSnapshot ??
    vi.fn(() => ({
      workspacePanelStateById: new Map<WorkspacePanelId, WorkspacePanelState>(),
      workspaceLayoutRoot: null,
    }));
  const renderWorkspaceLayout = vi.fn();

  const state = createWorkspaceManagerLayoutState({
    workspacePanelElements,
    dependencies: {
      removePanelFromWorkspaceLayout,
      applyWorkspaceDockDropToLayout,
      updateWorkspaceSplitRatioByPath,
      reconcileWorkspaceLayoutState,
      persistWorkspaceStateSnapshot,
      restoreWorkspaceStateSnapshot,
    },
  });
  state.setRenderWorkspaceLayout(renderWorkspaceLayout);

  return {
    panelEl,
    state,
    removePanelFromWorkspaceLayout,
    applyWorkspaceDockDropToLayout,
    updateWorkspaceSplitRatioByPath,
    reconcileWorkspaceLayoutState,
    persistWorkspaceStateSnapshot,
    restoreWorkspaceStateSnapshot,
    renderWorkspaceLayout,
  };
}

describe('createWorkspaceManagerLayoutState', () => {
  it('sets visible panel state, opens the panel, and persists + renders', () => {
    const harness = createHarness();

    harness.state.setWorkspacePanelState('componentsTreeSection', 'visible');

    expect(harness.panelEl.open).toBe(true);
    expect(harness.state.getWorkspacePanelStateById().get('componentsTreeSection')).toBe(
      'visible',
    );
    expect(harness.persistWorkspaceStateSnapshot).toHaveBeenCalledWith(
      harness.state.getWorkspacePanelStateById(),
      harness.state.getWorkspaceLayoutRoot(),
    );
    expect(harness.renderWorkspaceLayout).toHaveBeenCalledTimes(1);
  });

  it('removes panel from layout when panel state becomes closed', () => {
    const initialRoot = createPanelNode('componentsTreeSection');
    const nextRoot = createPanelNode('rawResultPanel');
    const removePanelFromWorkspaceLayout = vi.fn(() => ({ node: nextRoot, removed: true }));
    const harness = createHarness({
      removePanelFromWorkspaceLayout,
      restoreWorkspaceStateSnapshot: () => ({
        workspacePanelStateById: new Map<WorkspacePanelId, WorkspacePanelState>([
          ['componentsTreeSection', 'visible'],
        ]),
        workspaceLayoutRoot: initialRoot,
      }),
    });
    harness.state.restoreWorkspaceState();

    harness.state.setWorkspacePanelState('componentsTreeSection', 'closed');

    expect(removePanelFromWorkspaceLayout).toHaveBeenCalledWith(
      initialRoot,
      'componentsTreeSection',
    );
    expect(harness.state.getWorkspaceLayoutRoot()).toBe(nextRoot);
    expect(harness.persistWorkspaceStateSnapshot).toHaveBeenCalledTimes(1);
    expect(harness.renderWorkspaceLayout).toHaveBeenCalledTimes(1);
  });

  it('applies dock drop only when layout actually changes', () => {
    const initialRoot = createPanelNode('componentsTreeSection');
    const nextRoot = createPanelNode('rawResultPanel');
    const applyWorkspaceDockDropToLayout = vi
      .fn()
      .mockReturnValueOnce({
        layoutRoot: initialRoot,
        changed: false,
      })
      .mockReturnValueOnce({
        layoutRoot: nextRoot,
        changed: true,
      });
    const harness = createHarness({
      applyWorkspaceDockDropToLayout,
      restoreWorkspaceStateSnapshot: () => ({
        workspacePanelStateById: new Map<WorkspacePanelId, WorkspacePanelState>(),
        workspaceLayoutRoot: initialRoot,
      }),
    });
    harness.state.restoreWorkspaceState();
    const dropTarget = createDropTarget('left');

    harness.state.applyWorkspaceDockDrop('componentsTreeSection', dropTarget);
    expect(harness.persistWorkspaceStateSnapshot).not.toHaveBeenCalled();
    expect(harness.renderWorkspaceLayout).not.toHaveBeenCalled();

    harness.state.applyWorkspaceDockDrop('componentsTreeSection', dropTarget);
    expect(harness.state.getWorkspaceLayoutRoot()).toBe(nextRoot);
    expect(harness.persistWorkspaceStateSnapshot).toHaveBeenCalledTimes(1);
    expect(harness.renderWorkspaceLayout).toHaveBeenCalledTimes(1);
  });

  it('persists split ratio changes without forcing immediate rerender', () => {
    const nextRoot = createPanelNode('rawResultPanel');
    const updateWorkspaceSplitRatioByPath = vi.fn(() => nextRoot);
    const harness = createHarness({
      updateWorkspaceSplitRatioByPath,
    });

    harness.state.persistWorkspaceSplitRatio(['first'], 0.42);

    expect(updateWorkspaceSplitRatioByPath).toHaveBeenCalledWith(null, ['first'], 0.42);
    expect(harness.state.getWorkspaceLayoutRoot()).toBe(nextRoot);
    expect(harness.persistWorkspaceStateSnapshot).toHaveBeenCalledTimes(1);
    expect(harness.renderWorkspaceLayout).not.toHaveBeenCalled();
  });
});
