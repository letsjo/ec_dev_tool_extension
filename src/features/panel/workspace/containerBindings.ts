interface WorkspaceContainerHandlers {
  onWorkspaceDragOver: (event: DragEvent) => void;
  onWorkspaceDrop: (event: DragEvent) => void;
  onWorkspaceDragLeave: (event: DragEvent) => void;
  onWorkspaceSplitResizePointerDown: (event: PointerEvent) => void;
  onWorkspaceSplitDividerDoubleClick: (event: MouseEvent) => void;
  onWorkspacePanelToggleButtonClick: (event: MouseEvent) => void;
}

/** workspace 컨테이너 레벨 이벤트를 바인딩한다. */
export function bindWorkspaceContainerInteractions(
  panelContentEl: HTMLElement,
  workspacePanelToggleBarEl: HTMLDivElement,
  handlers: WorkspaceContainerHandlers,
) {
  panelContentEl.addEventListener('dragover', handlers.onWorkspaceDragOver);
  panelContentEl.addEventListener('drop', handlers.onWorkspaceDrop);
  panelContentEl.addEventListener('dragleave', handlers.onWorkspaceDragLeave);
  panelContentEl.addEventListener('pointerdown', handlers.onWorkspaceSplitResizePointerDown);
  panelContentEl.addEventListener('dblclick', handlers.onWorkspaceSplitDividerDoubleClick);
  workspacePanelToggleBarEl.addEventListener('click', handlers.onWorkspacePanelToggleButtonClick);
}

/** workspace 컨테이너 레벨 이벤트를 해제한다. */
export function unbindWorkspaceContainerInteractions(
  panelContentEl: HTMLElement,
  workspacePanelToggleBarEl: HTMLDivElement,
  handlers: WorkspaceContainerHandlers,
) {
  panelContentEl.removeEventListener('dragover', handlers.onWorkspaceDragOver);
  panelContentEl.removeEventListener('drop', handlers.onWorkspaceDrop);
  panelContentEl.removeEventListener('dragleave', handlers.onWorkspaceDragLeave);
  panelContentEl.removeEventListener('pointerdown', handlers.onWorkspaceSplitResizePointerDown);
  panelContentEl.removeEventListener('dblclick', handlers.onWorkspaceSplitDividerDoubleClick);
  workspacePanelToggleBarEl.removeEventListener('click', handlers.onWorkspacePanelToggleButtonClick);
}
