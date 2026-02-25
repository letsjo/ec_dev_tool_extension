import { describe, expect, it, vi } from 'vitest';
import { createWorkspaceManagerInteractionHandlers } from '../../src/features/panel/workspace/managerInteractionHandlers';

describe('createWorkspaceManagerInteractionHandlers', () => {
  it('maps drag/drop, resize, action handlers into interaction binding shape', () => {
    const workspaceDragDropFlow = {
      onWorkspacePanelDragStart: vi.fn(),
      onWorkspacePanelDragEnd: vi.fn(),
      onWorkspaceDragOver: vi.fn(),
      onWorkspaceDrop: vi.fn(),
      onWorkspaceDragLeave: vi.fn(),
    } as any;
    const workspaceResizeFlow = {
      onWorkspaceSplitResizePointerDown: vi.fn(),
      onWorkspaceSplitDividerDoubleClick: vi.fn(),
    } as any;
    const workspaceActionHandlers = {
      onWorkspaceSummaryAction: vi.fn(),
      onWorkspaceSummaryClick: vi.fn(),
      onWorkspaceActionButtonMouseDown: vi.fn(),
      onWorkspaceActionButtonDragStart: vi.fn(),
      onWorkspacePanelToggleButtonClick: vi.fn(),
    } as any;

    const { panelHandlers, containerHandlers } = createWorkspaceManagerInteractionHandlers({
      workspaceDragDropFlow,
      workspaceResizeFlow,
      workspaceActionHandlers,
    });

    expect(panelHandlers.onPanelDragStart).toBe(workspaceDragDropFlow.onWorkspacePanelDragStart);
    expect(panelHandlers.onPanelDragEnd).toBe(workspaceDragDropFlow.onWorkspacePanelDragEnd);
    expect(panelHandlers.onSummaryAction).toBe(workspaceActionHandlers.onWorkspaceSummaryAction);
    expect(panelHandlers.onSummaryClick).toBe(workspaceActionHandlers.onWorkspaceSummaryClick);
    expect(panelHandlers.onActionButtonMouseDown).toBe(
      workspaceActionHandlers.onWorkspaceActionButtonMouseDown,
    );
    expect(panelHandlers.onActionButtonDragStart).toBe(
      workspaceActionHandlers.onWorkspaceActionButtonDragStart,
    );

    expect(containerHandlers.onWorkspaceDragOver).toBe(workspaceDragDropFlow.onWorkspaceDragOver);
    expect(containerHandlers.onWorkspaceDrop).toBe(workspaceDragDropFlow.onWorkspaceDrop);
    expect(containerHandlers.onWorkspaceDragLeave).toBe(workspaceDragDropFlow.onWorkspaceDragLeave);
    expect(containerHandlers.onWorkspaceSplitResizePointerDown).toBe(
      workspaceResizeFlow.onWorkspaceSplitResizePointerDown,
    );
    expect(containerHandlers.onWorkspaceSplitDividerDoubleClick).toBe(
      workspaceResizeFlow.onWorkspaceSplitDividerDoubleClick,
    );
    expect(containerHandlers.onWorkspacePanelToggleButtonClick).toBe(
      workspaceActionHandlers.onWorkspacePanelToggleButtonClick,
    );
  });
});
