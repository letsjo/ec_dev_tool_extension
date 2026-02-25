import type { WorkspaceResizeDragState } from './splitResize';

export interface WorkspaceSplitResizeWindowHandlers {
  onPointerMove: (event: PointerEvent) => void;
  onPointerUp: (event: PointerEvent) => void;
  onPointerCancel: (event: PointerEvent) => void;
}

/** split resize drag 시작 시 전역 포인터 리스너/body 스타일을 세팅한다. */
export function startWorkspaceSplitResizeSession(
  dragState: WorkspaceResizeDragState,
  handlers: WorkspaceSplitResizeWindowHandlers,
) {
  const dividerEl = dragState.splitEl.querySelector<HTMLElement>(
    ':scope > .workspace-split-divider',
  );
  dividerEl?.classList.add('dragging');

  document.body.style.userSelect = 'none';
  document.body.style.cursor = dragState.axis === 'row' ? 'col-resize' : 'row-resize';

  window.addEventListener('pointermove', handlers.onPointerMove);
  window.addEventListener('pointerup', handlers.onPointerUp);
  window.addEventListener('pointercancel', handlers.onPointerCancel);
}

/** split resize drag 종료 시 전역 포인터 리스너/body 스타일을 복구한다. */
export function stopWorkspaceSplitResizeSession(
  dragState: WorkspaceResizeDragState,
  handlers: WorkspaceSplitResizeWindowHandlers,
) {
  window.removeEventListener('pointermove', handlers.onPointerMove);
  window.removeEventListener('pointerup', handlers.onPointerUp);
  window.removeEventListener('pointercancel', handlers.onPointerCancel);

  document.body.style.userSelect = '';
  document.body.style.cursor = '';

  const dividerEl = dragState.splitEl.querySelector<HTMLElement>(
    ':scope > .workspace-split-divider',
  );
  dividerEl?.classList.remove('dragging');
}
