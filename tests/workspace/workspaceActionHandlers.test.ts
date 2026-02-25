import { describe, expect, it, vi } from 'vitest';
import { createWorkspaceActionHandlers } from '../../src/features/panel/workspace/actionHandlers';
import type { WorkspacePanelId } from '../../src/features/panel/workspacePanels';

describe('workspaceActionHandlers', () => {
  const panelId: WorkspacePanelId = 'componentsTreeSection';

  it('routes summary action buttons to toggle/close handlers', () => {
    const toggleWorkspacePanelOpenState = vi.fn();
    const setWorkspacePanelState = vi.fn();
    const handlers = createWorkspaceActionHandlers({
      isWorkspacePanelId(value): value is WorkspacePanelId {
        return value === panelId;
      },
      getWorkspacePanelStateById: () => new Map([[panelId, 'visible']]),
      toggleWorkspacePanelOpenState,
      setWorkspacePanelState,
    });

    const toggleButton = document.createElement('button');
    toggleButton.className = 'workspace-panel-action';
    toggleButton.dataset.panelAction = 'toggle';
    toggleButton.dataset.panelTarget = panelId;
    const closeButton = document.createElement('button');
    closeButton.className = 'workspace-panel-action';
    closeButton.dataset.panelAction = 'close';
    closeButton.dataset.panelTarget = panelId;

    const togglePreventDefault = vi.fn();
    const toggleStopPropagation = vi.fn();
    handlers.onWorkspaceSummaryAction({
      target: toggleButton,
      preventDefault: togglePreventDefault,
      stopPropagation: toggleStopPropagation,
    } as unknown as MouseEvent);

    const closePreventDefault = vi.fn();
    const closeStopPropagation = vi.fn();
    handlers.onWorkspaceSummaryAction({
      target: closeButton,
      preventDefault: closePreventDefault,
      stopPropagation: closeStopPropagation,
    } as unknown as MouseEvent);

    expect(toggleWorkspacePanelOpenState).toHaveBeenCalledWith(panelId);
    expect(setWorkspacePanelState).toHaveBeenCalledWith(panelId, 'closed');
    expect(togglePreventDefault).toHaveBeenCalledTimes(1);
    expect(toggleStopPropagation).toHaveBeenCalledTimes(1);
    expect(closePreventDefault).toHaveBeenCalledTimes(1);
    expect(closeStopPropagation).toHaveBeenCalledTimes(1);
  });

  it('handles summary click and toggle bar click with state transitions', () => {
    const workspacePanelStateById = new Map<WorkspacePanelId, 'visible' | 'closed'>([
      [panelId, 'closed'],
    ]);
    const setWorkspacePanelState = vi.fn();
    const handlers = createWorkspaceActionHandlers({
      isWorkspacePanelId(value): value is WorkspacePanelId {
        return value === panelId;
      },
      getWorkspacePanelStateById: () => workspacePanelStateById,
      toggleWorkspacePanelOpenState: vi.fn(),
      setWorkspacePanelState,
    });

    const nonActionNode = document.createElement('span');
    const summaryPreventDefault = vi.fn();
    handlers.onWorkspaceSummaryClick({
      target: nonActionNode,
      preventDefault: summaryPreventDefault,
    } as unknown as MouseEvent);
    expect(summaryPreventDefault).toHaveBeenCalledTimes(1);

    const toggleButton = document.createElement('button');
    toggleButton.className = 'workspace-toggle-btn';
    toggleButton.dataset.panelToggle = panelId;
    handlers.onWorkspacePanelToggleButtonClick({
      target: toggleButton,
    } as unknown as MouseEvent);
    expect(setWorkspacePanelState).toHaveBeenCalledWith(panelId, 'visible');

    workspacePanelStateById.set(panelId, 'visible');
    handlers.onWorkspacePanelToggleButtonClick({
      target: toggleButton,
    } as unknown as MouseEvent);
    expect(setWorkspacePanelState).toHaveBeenCalledWith(panelId, 'closed');
  });
});
