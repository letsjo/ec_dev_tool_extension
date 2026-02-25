import type { WorkspacePanelId } from '../workspacePanels';

interface WorkspacePanelInteractionHandlers {
  onPanelDragStart: (event: DragEvent) => void;
  onPanelDragEnd: (event: DragEvent) => void;
  onSummaryAction: (event: MouseEvent) => void;
  onSummaryClick: (event: MouseEvent) => void;
  onActionButtonMouseDown: (event: MouseEvent) => void;
  onActionButtonDragStart: (event: DragEvent) => void;
}

/** workspace panel summary/action 버튼 이벤트를 바인딩한다. */
export function bindWorkspacePanelInteractions(
  workspacePanelElements: Map<WorkspacePanelId, HTMLDetailsElement>,
  handlers: WorkspacePanelInteractionHandlers,
) {
  workspacePanelElements.forEach((panelEl, panelId) => {
    panelEl.classList.add('workspace-panel');
    panelEl.dataset.panelId = panelId;

    const summaryEl = panelEl.querySelector<HTMLElement>('summary.workspace-panel-summary');
    if (summaryEl) {
      summaryEl.draggable = true;
      summaryEl.addEventListener('dragstart', handlers.onPanelDragStart);
      summaryEl.addEventListener('dragend', handlers.onPanelDragEnd);
      summaryEl.addEventListener('click', handlers.onSummaryAction);
      summaryEl.addEventListener('click', handlers.onSummaryClick);
    }

    const actionButtons = panelEl.querySelectorAll<HTMLButtonElement>('.workspace-panel-action');
    actionButtons.forEach((button) => {
      button.addEventListener('mousedown', handlers.onActionButtonMouseDown);
      button.addEventListener('dragstart', handlers.onActionButtonDragStart);
    });
  });
}

/** workspace panel summary/action 버튼 이벤트를 해제한다. */
export function unbindWorkspacePanelInteractions(
  workspacePanelElements: Map<WorkspacePanelId, HTMLDetailsElement>,
  handlers: WorkspacePanelInteractionHandlers,
) {
  workspacePanelElements.forEach((panelEl) => {
    const summaryEl = panelEl.querySelector<HTMLElement>('summary.workspace-panel-summary');
    if (summaryEl) {
      summaryEl.removeEventListener('dragstart', handlers.onPanelDragStart);
      summaryEl.removeEventListener('dragend', handlers.onPanelDragEnd);
      summaryEl.removeEventListener('click', handlers.onSummaryAction);
      summaryEl.removeEventListener('click', handlers.onSummaryClick);
    }

    const actionButtons = panelEl.querySelectorAll<HTMLButtonElement>('.workspace-panel-action');
    actionButtons.forEach((button) => {
      button.removeEventListener('mousedown', handlers.onActionButtonMouseDown);
      button.removeEventListener('dragstart', handlers.onActionButtonDragStart);
    });
  });
}
