import type { WorkspacePanelId } from '../workspacePanels';
import type { WorkspacePanelState } from './layout/layoutModel';

export interface CreateWorkspaceActionHandlersOptions {
  isWorkspacePanelId: (value: unknown) => value is WorkspacePanelId;
  getWorkspacePanelStateById: () => Map<WorkspacePanelId, WorkspacePanelState>;
  toggleWorkspacePanelOpenState: (panelId: WorkspacePanelId) => void;
  setWorkspacePanelState: (panelId: WorkspacePanelId, state: WorkspacePanelState) => void;
}

/** workspace summary/toggle bar 액션 이벤트 핸들러를 조립한다. */
export function createWorkspaceActionHandlers(options: CreateWorkspaceActionHandlersOptions) {
  /** 이벤트를 처리 */
  function onWorkspaceSummaryAction(event: MouseEvent) {
    const target = event.target as HTMLElement | null;
    const actionButton = target?.closest<HTMLButtonElement>(
      '.workspace-panel-action[data-panel-action]',
    );
    if (!actionButton) return;

    const panelIdRaw = actionButton.dataset.panelTarget;
    if (!options.isWorkspacePanelId(panelIdRaw)) return;
    const action = actionButton.dataset.panelAction;
    event.preventDefault();
    event.stopPropagation();

    if (action === 'toggle') {
      options.toggleWorkspacePanelOpenState(panelIdRaw);
      return;
    }
    if (action === 'close') {
      options.setWorkspacePanelState(panelIdRaw, 'closed');
    }
  }

  /** 이벤트를 처리 */
  function onWorkspaceSummaryClick(event: MouseEvent) {
    const target = event.target as HTMLElement | null;
    const actionButton = target?.closest<HTMLButtonElement>(
      '.workspace-panel-action[data-panel-action]',
    );
    if (actionButton) return;
    event.preventDefault();
  }

  /** 이벤트를 처리 */
  function onWorkspacePanelToggleButtonClick(event: MouseEvent) {
    const target = event.target as HTMLElement | null;
    const button = target?.closest<HTMLButtonElement>('.workspace-toggle-btn[data-panel-toggle]');
    if (!button) return;
    const panelIdRaw = button.dataset.panelToggle;
    if (!options.isWorkspacePanelId(panelIdRaw)) return;
    const state = options.getWorkspacePanelStateById().get(panelIdRaw) ?? 'visible';
    options.setWorkspacePanelState(panelIdRaw, state === 'visible' ? 'closed' : 'visible');
  }

  /** 이벤트를 처리 */
  function onWorkspaceActionButtonMouseDown(event: MouseEvent) {
    event.stopPropagation();
  }

  /** 이벤트를 처리 */
  function onWorkspaceActionButtonDragStart(event: DragEvent) {
    event.preventDefault();
  }

  return {
    onWorkspaceSummaryAction,
    onWorkspaceSummaryClick,
    onWorkspacePanelToggleButtonClick,
    onWorkspaceActionButtonMouseDown,
    onWorkspaceActionButtonDragStart,
  };
}
