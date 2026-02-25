import { isWorkspacePanelId } from '../workspacePanels';
import type { WorkspaceDockDirection } from './layoutModel';

/** 조건에 맞는 대상을 탐색 */
export function findWorkspacePanelByPoint(
  clientX: number,
  clientY: number,
): HTMLDetailsElement | null {
  const target = document.elementFromPoint(clientX, clientY);
  const panelEl = target instanceof HTMLElement ? target.closest('details.workspace-panel') : null;
  if (!(panelEl instanceof HTMLDetailsElement)) return null;
  if (!isWorkspacePanelId(panelEl.id)) return null;
  if (panelEl.hidden) return null;
  return panelEl;
}

/** 필요한 값/상태를 계산해 반환 */
export function computeWorkspaceDockDirection(
  panelEl: HTMLElement,
  clientX: number,
  clientY: number,
): WorkspaceDockDirection {
  const rect = panelEl.getBoundingClientRect();
  const edgeX = Math.max(44, rect.width * 0.24);
  const edgeY = Math.max(44, rect.height * 0.24);

  if (clientX < rect.left + edgeX) return 'left';
  if (clientX > rect.right - edgeX) return 'right';
  if (clientY < rect.top + edgeY) return 'top';
  if (clientY > rect.bottom - edgeY) return 'bottom';
  return 'center';
}

/** 화면 요소를 렌더링 */
export function hideWorkspaceDockPreview(workspaceDockPreviewEl: HTMLDivElement) {
  workspaceDockPreviewEl.style.display = 'none';
}

/** 화면 요소를 렌더링 */
export function showWorkspaceDockPreview(
  workspaceDockPreviewEl: HTMLDivElement,
  panelContentEl: HTMLElement,
  baseRect: DOMRect,
  direction: WorkspaceDockDirection,
) {
  const hostRect = panelContentEl.getBoundingClientRect();
  const previewLeft = baseRect.left - hostRect.left;
  const previewTop = baseRect.top - hostRect.top;
  const width = baseRect.width;
  const height = baseRect.height;

  let left = previewLeft;
  let top = previewTop;
  let previewWidth = width;
  let previewHeight = height;

  if (direction === 'left') {
    previewWidth = width / 2;
  } else if (direction === 'right') {
    previewWidth = width / 2;
    left = previewLeft + width / 2;
  } else if (direction === 'top') {
    previewHeight = height / 2;
  } else if (direction === 'bottom') {
    previewHeight = height / 2;
    top = previewTop + height / 2;
  }

  workspaceDockPreviewEl.style.display = 'block';
  workspaceDockPreviewEl.style.left = `${Math.round(left)}px`;
  workspaceDockPreviewEl.style.top = `${Math.round(top)}px`;
  workspaceDockPreviewEl.style.width = `${Math.max(0, Math.round(previewWidth))}px`;
  workspaceDockPreviewEl.style.height = `${Math.max(0, Math.round(previewHeight))}px`;
}
