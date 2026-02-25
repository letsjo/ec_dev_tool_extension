import type { WorkspacePanelId } from '../workspacePanels';
import type { WorkspaceLayoutNode } from './layoutModel';
import { hideWorkspaceDockPreview as hideWorkspaceDockPreviewValue } from './dockPreview';
import { patchWorkspaceLayoutDomNode as patchWorkspaceLayoutDomNodeValue } from './domPatcher';
import { getWorkspaceLayoutRootElement as getWorkspaceLayoutRootElementValue } from './domReuse';

interface RenderWorkspaceLayoutPipelineOptions {
  panelContentEl: HTMLElement;
  workspaceDockPreviewEl: HTMLDivElement;
  workspaceLayoutRoot: WorkspaceLayoutNode | null;
  workspacePanelElements: Map<WorkspacePanelId, HTMLDetailsElement>;
  hideWorkspaceDockPreview?: typeof hideWorkspaceDockPreviewValue;
  getWorkspaceLayoutRootElement?: typeof getWorkspaceLayoutRootElementValue;
  patchWorkspaceLayoutDomNode?: typeof patchWorkspaceLayoutDomNodeValue;
}

interface WorkspaceLayoutPipelineResult {
  hasLayoutRoot: boolean;
}

/** workspace 레이아웃이 비어 있을 때 사용할 empty placeholder DOM을 구성한다. */
function createWorkspaceEmptyPlaceholder(): HTMLDivElement {
  const empty = document.createElement('div');
  empty.className = 'workspace-empty';
  empty.textContent = '표시 중인 패널이 없습니다. 하단 footer에서 패널을 다시 켜주세요.';
  return empty;
}

/** workspace dock preview를 컨테이너 첫 자식으로 고정하고 숨김 상태를 적용한다. */
function prepareWorkspaceDockPreview(
  panelContentEl: HTMLElement,
  workspaceDockPreviewEl: HTMLDivElement,
  hideWorkspaceDockPreview: (el: HTMLDivElement) => void,
) {
  if (workspaceDockPreviewEl.parentElement !== panelContentEl) {
    panelContentEl.appendChild(workspaceDockPreviewEl);
  }
  if (panelContentEl.firstElementChild !== workspaceDockPreviewEl) {
    panelContentEl.insertBefore(workspaceDockPreviewEl, panelContentEl.firstChild);
  }
  hideWorkspaceDockPreview(workspaceDockPreviewEl);
}

/** patch 결과 루트를 preview 다음 위치로 옮기고, 남은 stale child를 제거한다. */
function commitWorkspaceRootElement(
  panelContentEl: HTMLElement,
  workspaceDockPreviewEl: HTMLDivElement,
  nextRoot: HTMLElement,
) {
  if (nextRoot.parentElement !== panelContentEl) {
    panelContentEl.insertBefore(nextRoot, workspaceDockPreviewEl.nextSibling);
  } else if (workspaceDockPreviewEl.nextSibling !== nextRoot) {
    panelContentEl.insertBefore(nextRoot, workspaceDockPreviewEl.nextSibling);
  }

  Array.from(panelContentEl.children).forEach((child) => {
    if (child !== workspaceDockPreviewEl && child !== nextRoot) {
      panelContentEl.removeChild(child);
    }
  });
}

/** workspace layout root를 patch/empty fallback으로 정하고 DOM에 반영한다. */
export function renderWorkspaceLayoutPipeline(
  options: RenderWorkspaceLayoutPipelineOptions,
): WorkspaceLayoutPipelineResult {
  const hideWorkspaceDockPreview =
    options.hideWorkspaceDockPreview ?? hideWorkspaceDockPreviewValue;
  const getWorkspaceLayoutRootElement =
    options.getWorkspaceLayoutRootElement ?? getWorkspaceLayoutRootElementValue;
  const patchWorkspaceLayoutDomNode =
    options.patchWorkspaceLayoutDomNode ?? patchWorkspaceLayoutDomNodeValue;

  prepareWorkspaceDockPreview(
    options.panelContentEl,
    options.workspaceDockPreviewEl,
    hideWorkspaceDockPreview,
  );

  const existingRoot = getWorkspaceLayoutRootElement(
    options.panelContentEl,
    options.workspaceDockPreviewEl,
  );
  const layoutRoot = options.workspaceLayoutRoot;
  const hasLayoutRoot = layoutRoot !== null;
  const nextRoot = hasLayoutRoot
    ? patchWorkspaceLayoutDomNode({
        layoutNode: layoutRoot,
        existingRoot,
        workspacePanelElements: options.workspacePanelElements,
      })
    : existingRoot && existingRoot.classList.contains('workspace-empty')
      ? existingRoot
      : createWorkspaceEmptyPlaceholder();

  commitWorkspaceRootElement(options.panelContentEl, options.workspaceDockPreviewEl, nextRoot);

  return {
    hasLayoutRoot,
  };
}
