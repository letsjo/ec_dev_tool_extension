import { describe, expect, it, vi } from 'vitest';
import { createWorkspaceRenderFlow } from '../../src/features/panel/workspace/renderFlow';
import type { WorkspacePanelId } from '../../src/features/panel/workspacePanels';
import type { WorkspaceLayoutNode, WorkspacePanelState } from '../../src/features/panel/workspace/layoutModel';

function createWorkspacePanel(panelId: WorkspacePanelId): HTMLDetailsElement {
  const panelEl = document.createElement('details');
  panelEl.className = 'workspace-panel';
  panelEl.open = true;

  const summaryEl = document.createElement('summary');
  summaryEl.className = 'workspace-panel-summary';
  const toggleAction = document.createElement('button');
  toggleAction.className = 'workspace-panel-action';
  toggleAction.dataset.panelAction = 'toggle';
  toggleAction.dataset.panelTarget = panelId;
  toggleAction.textContent = '▾';
  summaryEl.appendChild(toggleAction);
  panelEl.appendChild(summaryEl);

  const bodyEl = document.createElement('div');
  bodyEl.className = 'components-pane-body';
  panelEl.appendChild(bodyEl);
  return panelEl;
}

describe('workspaceRenderFlow', () => {
  it('applies panel visibility state and toggle bar state on render', () => {
    const panelId: WorkspacePanelId = 'componentsTreeSection';
    const panelContentEl = document.createElement('section');
    const workspaceDockPreviewEl = document.createElement('div');
    const workspacePanelToggleBarEl = document.createElement('div');
    const toggleButton = document.createElement('button');
    toggleButton.className = 'workspace-toggle-btn';
    toggleButton.dataset.panelToggle = panelId;
    workspacePanelToggleBarEl.appendChild(toggleButton);
    const panelEl = createWorkspacePanel(panelId);
    panelContentEl.appendChild(panelEl);

    let workspaceLayoutRoot: WorkspaceLayoutNode | null = null;
    const workspacePanelStateById = new Map<WorkspacePanelId, WorkspacePanelState>([
      [panelId, 'closed'],
    ]);
    const reconcileWorkspaceLayout = vi.fn();

    const flow = createWorkspaceRenderFlow({
      panelContentEl,
      workspaceDockPreviewEl,
      workspacePanelToggleBarEl,
      workspacePanelElements: new Map([[panelId, panelEl]]),
      getWorkspaceLayoutRoot: () => workspaceLayoutRoot,
      getWorkspacePanelStateById: () => workspacePanelStateById,
      reconcileWorkspaceLayout,
    });

    flow.renderWorkspaceLayout();

    expect(reconcileWorkspaceLayout).toHaveBeenCalledTimes(1);
    expect(panelEl.hidden).toBe(true);
    expect(panelEl.dataset.panelState).toBe('closed');
    expect(toggleButton.classList.contains('active')).toBe(false);
    expect(toggleButton.getAttribute('aria-pressed')).toBe('false');

    workspaceLayoutRoot = null;
  });

  it('toggles panel open state and updates summary toggle control text', () => {
    const panelId: WorkspacePanelId = 'componentsTreeSection';
    const panelEl = createWorkspacePanel(panelId);
    const panelContentEl = document.createElement('section');
    const workspacePanelToggleBarEl = document.createElement('div');
    const workspaceDockPreviewEl = document.createElement('div');
    const flow = createWorkspaceRenderFlow({
      panelContentEl,
      workspaceDockPreviewEl,
      workspacePanelToggleBarEl,
      workspacePanelElements: new Map([[panelId, panelEl]]),
      getWorkspaceLayoutRoot: () => null,
      getWorkspacePanelStateById: () => new Map(),
      reconcileWorkspaceLayout: () => {},
    });
    const toggleAction = panelEl.querySelector<HTMLButtonElement>(
      '.workspace-panel-action[data-panel-action="toggle"]',
    );
    if (!toggleAction) throw new Error('toggle action button missing');

    flow.toggleWorkspacePanelOpenState(panelId);
    expect(panelEl.open).toBe(false);
    expect(toggleAction.textContent).toBe('▸');

    flow.toggleWorkspacePanelOpenState(panelId);
    expect(panelEl.open).toBe(true);
    expect(toggleAction.textContent).toBe('▾');
  });
});
