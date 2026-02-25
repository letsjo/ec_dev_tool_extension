import { describe, expect, it, vi } from 'vitest';
import { bindWorkspaceInteractionBindings } from '../../src/features/panel/workspace/interactionBindings';
import type { WorkspacePanelId } from '../../src/features/panel/workspacePanels';

function createWorkspacePanel(panelId: WorkspacePanelId): HTMLDetailsElement {
  const panelEl = document.createElement('details');
  const summaryEl = document.createElement('summary');
  summaryEl.className = 'workspace-panel-summary';
  panelEl.appendChild(summaryEl);

  const actionButton = document.createElement('button');
  actionButton.className = 'workspace-panel-action';
  panelEl.appendChild(actionButton);

  panelEl.dataset.panelId = panelId;
  return panelEl;
}

describe('workspaceInteractionBindings', () => {
  it('binds panel/container handlers and unbinds them through returned cleanup', () => {
    const panelContentEl = document.createElement('section');
    const workspacePanelToggleBarEl = document.createElement('div');
    const panelId: WorkspacePanelId = 'componentsTreeSection';
    const panelEl = createWorkspacePanel(panelId);
    const summaryEl = panelEl.querySelector('summary.workspace-panel-summary');
    const actionButton = panelEl.querySelector('button.workspace-panel-action');
    if (!summaryEl || !actionButton) throw new Error('test panel nodes are missing');

    const workspacePanelElements = new Map<WorkspacePanelId, HTMLDetailsElement>([
      [panelId, panelEl],
    ]);

    const panelHandlers = {
      onPanelDragStart: vi.fn(),
      onPanelDragEnd: vi.fn(),
      onSummaryAction: vi.fn(),
      onSummaryClick: vi.fn(),
      onActionButtonMouseDown: vi.fn(),
      onActionButtonDragStart: vi.fn(),
    };
    const containerHandlers = {
      onWorkspaceDragOver: vi.fn(),
      onWorkspaceDrop: vi.fn(),
      onWorkspaceDragLeave: vi.fn(),
      onWorkspaceSplitResizePointerDown: vi.fn(),
      onWorkspaceSplitDividerDoubleClick: vi.fn(),
      onWorkspacePanelToggleButtonClick: vi.fn(),
    };

    const unbind = bindWorkspaceInteractionBindings({
      panelContentEl,
      workspacePanelToggleBarEl,
      workspacePanelElements,
      panelHandlers,
      containerHandlers,
    });

    expect(summaryEl.draggable).toBe(true);
    expect(panelEl.classList.contains('workspace-panel')).toBe(true);
    expect(panelEl.dataset.panelId).toBe(panelId);

    summaryEl.dispatchEvent(new Event('dragstart'));
    summaryEl.dispatchEvent(new Event('dragend'));
    summaryEl.dispatchEvent(new Event('click'));
    actionButton.dispatchEvent(new Event('mousedown'));
    actionButton.dispatchEvent(new Event('dragstart'));
    panelContentEl.dispatchEvent(new Event('dragover'));
    panelContentEl.dispatchEvent(new Event('drop'));
    panelContentEl.dispatchEvent(new Event('dragleave'));
    panelContentEl.dispatchEvent(new Event('pointerdown'));
    panelContentEl.dispatchEvent(new Event('dblclick'));
    workspacePanelToggleBarEl.dispatchEvent(new Event('click'));

    expect(panelHandlers.onPanelDragStart).toHaveBeenCalledTimes(1);
    expect(panelHandlers.onPanelDragEnd).toHaveBeenCalledTimes(1);
    expect(panelHandlers.onSummaryAction).toHaveBeenCalledTimes(1);
    expect(panelHandlers.onSummaryClick).toHaveBeenCalledTimes(1);
    expect(panelHandlers.onActionButtonMouseDown).toHaveBeenCalledTimes(1);
    expect(panelHandlers.onActionButtonDragStart).toHaveBeenCalledTimes(1);
    expect(containerHandlers.onWorkspaceDragOver).toHaveBeenCalledTimes(1);
    expect(containerHandlers.onWorkspaceDrop).toHaveBeenCalledTimes(1);
    expect(containerHandlers.onWorkspaceDragLeave).toHaveBeenCalledTimes(1);
    expect(containerHandlers.onWorkspaceSplitResizePointerDown).toHaveBeenCalledTimes(1);
    expect(containerHandlers.onWorkspaceSplitDividerDoubleClick).toHaveBeenCalledTimes(1);
    expect(containerHandlers.onWorkspacePanelToggleButtonClick).toHaveBeenCalledTimes(1);

    unbind();

    summaryEl.dispatchEvent(new Event('dragstart'));
    summaryEl.dispatchEvent(new Event('click'));
    actionButton.dispatchEvent(new Event('mousedown'));
    panelContentEl.dispatchEvent(new Event('drop'));
    workspacePanelToggleBarEl.dispatchEvent(new Event('click'));

    expect(panelHandlers.onPanelDragStart).toHaveBeenCalledTimes(1);
    expect(panelHandlers.onSummaryAction).toHaveBeenCalledTimes(1);
    expect(panelHandlers.onSummaryClick).toHaveBeenCalledTimes(1);
    expect(panelHandlers.onActionButtonMouseDown).toHaveBeenCalledTimes(1);
    expect(containerHandlers.onWorkspaceDrop).toHaveBeenCalledTimes(1);
    expect(containerHandlers.onWorkspacePanelToggleButtonClick).toHaveBeenCalledTimes(1);
  });
});
