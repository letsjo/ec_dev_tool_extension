import {
  clampWorkspaceSplitRatio,
  parseWorkspaceNodePath,
  type WorkspaceNodePath,
} from './layout/layoutModel';

export interface WorkspaceResizeDragState {
  splitPath: WorkspaceNodePath;
  axis: 'row' | 'column';
  splitEl: HTMLElement;
  splitRect: DOMRect;
  dividerSize: number;
  ratio: number;
}

/** split ratio를 현재 DOM style에 반영한다. */
export function applyWorkspaceSplitRatioStyle(splitEl: HTMLElement, ratio: number) {
  splitEl.style.setProperty('--workspace-split-first', `${ratio}fr`);
  splitEl.style.setProperty('--workspace-split-second', `${1 - ratio}fr`);
}

/** pointer 위치를 현재 drag state 기준 split ratio로 환산한다. */
export function computeWorkspaceResizeRatioFromPointer(
  state: WorkspaceResizeDragState,
  event: PointerEvent,
): number | null {
  const totalSize =
    state.axis === 'row'
      ? state.splitRect.width - state.dividerSize
      : state.splitRect.height - state.dividerSize;
  if (totalSize <= 0) return null;

  const pointerOffset =
    state.axis === 'row'
      ? event.clientX - state.splitRect.left
      : event.clientY - state.splitRect.top;
  return clampWorkspaceSplitRatio((pointerOffset - state.dividerSize / 2) / totalSize);
}

/** pointerdown target에서 split drag 시작 상태를 복원한다. */
export function createWorkspaceResizeDragStateFromTarget(
  target: EventTarget | null,
): WorkspaceResizeDragState | null {
  const targetEl = target instanceof HTMLElement ? target : null;
  const dividerEl = targetEl?.closest<HTMLElement>('.workspace-split-divider');
  if (!dividerEl) return null;
  const splitEl = dividerEl.parentElement;
  if (!(splitEl instanceof HTMLElement)) return null;

  const axisRaw = splitEl.dataset.splitAxis;
  if (axisRaw !== 'row' && axisRaw !== 'column') return null;

  const splitRect = splitEl.getBoundingClientRect();
  const dividerRect = dividerEl.getBoundingClientRect();
  const dividerSize = axisRaw === 'row' ? dividerRect.width : dividerRect.height;
  const splitPath = parseWorkspaceNodePath(splitEl.dataset.splitPath ?? '');
  const firstRaw = splitEl.style.getPropertyValue('--workspace-split-first').trim();
  const nextRatioFromCss = Number.parseFloat(firstRaw.replace('fr', ''));
  const ratio = Number.isFinite(nextRatioFromCss)
    ? clampWorkspaceSplitRatio(nextRatioFromCss)
    : 0.5;

  return {
    splitPath,
    axis: axisRaw,
    splitEl,
    splitRect,
    dividerSize,
    ratio,
  };
}
