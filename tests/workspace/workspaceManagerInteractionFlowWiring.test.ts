import { describe, expect, it, vi } from 'vitest';
import type { WorkspacePanelId } from '../../src/features/panel/workspacePanels';
import type {
  WorkspaceDropTarget,
  WorkspaceNodePath,
  WorkspacePanelState,
} from '../../src/features/panel/workspace/layoutModel';
import type { WorkspaceInteractionBindingsOptions } from '../../src/features/panel/workspace/interactionBindings';
import { createWorkspaceManagerInteractionFlowWiring } from '../../src/features/panel/workspace/managerInteractionFlowWiring';

function createWorkspaceElements() {
  const panelContentEl = document.createElement('div');
  const workspaceDockPreviewEl = document.createElement('div');
  const panelEl = document.createElement('details');
  panelEl.id = 'componentsTreeSection';
  const workspacePanelElements = new Map<WorkspacePanelId, HTMLDetailsElement>([
    ['componentsTreeSection', panelEl],
  ]);

  return {
    panelContentEl,
    workspaceDockPreviewEl,
    workspacePanelElements,
  };
}

describe('createWorkspaceManagerInteractionFlowWiring', () => {
  it('connects drag/resize/action flow factories and exposes manager handlers', () => {
    const elements = createWorkspaceElements();
    const applyWorkspaceDockDrop = vi.fn();
    const persistWorkspaceSplitRatio = vi.fn();
    const getWorkspacePanelStateById = vi.fn(
      () => new Map<WorkspacePanelId, WorkspacePanelState>([['componentsTreeSection', 'visible']]),
    );
    const setWorkspacePanelState = vi.fn();
    const toggleWorkspacePanelOpenState = vi.fn();

    const dragFlow = {
      onWorkspacePanelDragStart: vi.fn(),
      onWorkspacePanelDragEnd: vi.fn(),
      onWorkspaceDragOver: vi.fn(),
      onWorkspaceDrop: vi.fn(),
      onWorkspaceDragLeave: vi.fn(),
    };
    const resizeFlow = {
      onWorkspaceSplitResizePointerDown: vi.fn(),
      onWorkspaceSplitResizePointerMove: vi.fn(),
      onWorkspaceSplitResizePointerUp: vi.fn(),
      onWorkspaceSplitResizePointerCancel: vi.fn(),
      onWorkspaceSplitDividerDoubleClick: vi.fn(),
      stopWorkspaceSplitResize: vi.fn(),
    };
    const actionHandlers = {
      onWorkspaceSummaryAction: vi.fn(),
      onWorkspaceSummaryClick: vi.fn(),
      onWorkspacePanelToggleButtonClick: vi.fn(),
      onWorkspaceActionButtonMouseDown: vi.fn(),
      onWorkspaceActionButtonDragStart: vi.fn(),
    };
    const panelHandlers: WorkspaceInteractionBindingsOptions['panelHandlers'] = {
      onPanelDragStart: vi.fn(),
      onPanelDragEnd: vi.fn(),
      onSummaryAction: vi.fn(),
      onSummaryClick: vi.fn(),
      onActionButtonMouseDown: vi.fn(),
      onActionButtonDragStart: vi.fn(),
    };
    const containerHandlers: WorkspaceInteractionBindingsOptions['containerHandlers'] = {
      onWorkspaceDragOver: vi.fn(),
      onWorkspaceDrop: vi.fn(),
      onWorkspaceDragLeave: vi.fn(),
      onWorkspaceSplitResizePointerDown: vi.fn(),
      onWorkspaceSplitDividerDoubleClick: vi.fn(),
      onWorkspacePanelToggleButtonClick: vi.fn(),
    };

    const createWorkspaceDragDropFlow = vi.fn(() => dragFlow);
    const createWorkspaceResizeFlow = vi.fn(() => resizeFlow);
    const createWorkspaceActionHandlers = vi.fn(() => actionHandlers);
    const createWorkspaceManagerInteractionHandlers = vi.fn(() => ({
      panelHandlers,
      containerHandlers,
    }));

    const wiring = createWorkspaceManagerInteractionFlowWiring(
      {
        panelContentEl: elements.panelContentEl,
        workspaceDockPreviewEl: elements.workspaceDockPreviewEl,
        workspacePanelElements: elements.workspacePanelElements,
        applyWorkspaceDockDrop,
        persistWorkspaceSplitRatio,
        getWorkspacePanelStateById,
        setWorkspacePanelState,
        toggleWorkspacePanelOpenState,
      },
      {
        createWorkspaceDragDropFlow,
        createWorkspaceResizeFlow,
        createWorkspaceActionHandlers,
        createWorkspaceManagerInteractionHandlers,
      },
    );

    expect(createWorkspaceDragDropFlow).toHaveBeenCalledTimes(1);
    expect(createWorkspaceResizeFlow).toHaveBeenCalledTimes(1);
    expect(createWorkspaceActionHandlers).toHaveBeenCalledWith(
      expect.objectContaining({
        getWorkspacePanelStateById,
        setWorkspacePanelState,
        toggleWorkspacePanelOpenState,
      }),
    );
    expect(createWorkspaceManagerInteractionHandlers).toHaveBeenCalledWith({
      workspaceDragDropFlow: dragFlow,
      workspaceResizeFlow: resizeFlow,
      workspaceActionHandlers: actionHandlers,
    });
    expect(wiring.panelHandlers).toBe(panelHandlers);
    expect(wiring.containerHandlers).toBe(containerHandlers);
  });

  it('forwards dock-drop and split-ratio persistence callbacks into flows', () => {
    const elements = createWorkspaceElements();
    const applyWorkspaceDockDrop = vi.fn();
    const persistWorkspaceSplitRatio = vi.fn();

    const createWorkspaceDragDropFlow = vi.fn(() => ({
      onWorkspacePanelDragStart: vi.fn(),
      onWorkspacePanelDragEnd: vi.fn(),
      onWorkspaceDragOver: vi.fn(),
      onWorkspaceDrop: vi.fn(),
      onWorkspaceDragLeave: vi.fn(),
    }));
    const createWorkspaceResizeFlow = vi.fn(() => ({
      onWorkspaceSplitResizePointerDown: vi.fn(),
      onWorkspaceSplitResizePointerMove: vi.fn(),
      onWorkspaceSplitResizePointerUp: vi.fn(),
      onWorkspaceSplitResizePointerCancel: vi.fn(),
      onWorkspaceSplitDividerDoubleClick: vi.fn(),
      stopWorkspaceSplitResize: vi.fn(),
    }));

    createWorkspaceManagerInteractionFlowWiring(
      {
        panelContentEl: elements.panelContentEl,
        workspaceDockPreviewEl: elements.workspaceDockPreviewEl,
        workspacePanelElements: elements.workspacePanelElements,
        applyWorkspaceDockDrop,
        persistWorkspaceSplitRatio,
        getWorkspacePanelStateById: () => new Map<WorkspacePanelId, WorkspacePanelState>(),
        setWorkspacePanelState: vi.fn(),
        toggleWorkspacePanelOpenState: vi.fn(),
      },
      {
        createWorkspaceDragDropFlow,
        createWorkspaceResizeFlow,
        createWorkspaceActionHandlers: vi.fn(() => ({
          onWorkspaceSummaryAction: vi.fn(),
          onWorkspaceSummaryClick: vi.fn(),
          onWorkspacePanelToggleButtonClick: vi.fn(),
          onWorkspaceActionButtonMouseDown: vi.fn(),
          onWorkspaceActionButtonDragStart: vi.fn(),
        })),
        createWorkspaceManagerInteractionHandlers: vi.fn(() => ({
          panelHandlers: {
            onPanelDragStart: vi.fn(),
            onPanelDragEnd: vi.fn(),
            onSummaryAction: vi.fn(),
            onSummaryClick: vi.fn(),
            onActionButtonMouseDown: vi.fn(),
            onActionButtonDragStart: vi.fn(),
          },
          containerHandlers: {
            onWorkspaceDragOver: vi.fn(),
            onWorkspaceDrop: vi.fn(),
            onWorkspaceDragLeave: vi.fn(),
            onWorkspaceSplitResizePointerDown: vi.fn(),
            onWorkspaceSplitDividerDoubleClick: vi.fn(),
            onWorkspacePanelToggleButtonClick: vi.fn(),
          },
        })),
      },
    );

    const dragFlowArgs = createWorkspaceDragDropFlow.mock.calls[0][0] as {
      applyWorkspaceDockDrop: (draggedPanelId: WorkspacePanelId, dropTarget: WorkspaceDropTarget) => void;
    };
    const resizeFlowArgs = createWorkspaceResizeFlow.mock.calls[0][0] as {
      onPersistSplitRatio: (splitPath: WorkspaceNodePath, ratio: number) => void;
    };
    dragFlowArgs.applyWorkspaceDockDrop('componentsTreeSection', {
      targetPanelId: null,
      direction: 'left',
    });
    resizeFlowArgs.onPersistSplitRatio(['first'], 0.45);

    expect(applyWorkspaceDockDrop).toHaveBeenCalledWith('componentsTreeSection', {
      targetPanelId: null,
      direction: 'left',
    });
    expect(persistWorkspaceSplitRatio).toHaveBeenCalledWith(['first'], 0.45);
  });
});
