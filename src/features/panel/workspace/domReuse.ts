import { isWorkspacePanelId, type WorkspacePanelId } from '../workspacePanels';
import {
  collectPanelIdsFromLayout,
  type WorkspaceLayoutNode,
} from './layoutModel';

/** 파생 데이터나 요약 값을 구성 */
export function collectWorkspacePanelIdsFromDom(rootEl: Element | null): Set<WorkspacePanelId> {
  const result = new Set<WorkspacePanelId>();
  if (!(rootEl instanceof Element)) return result;

  if (rootEl instanceof HTMLDetailsElement && isWorkspacePanelId(rootEl.id)) {
    result.add(rootEl.id);
  }

  rootEl.querySelectorAll('details.workspace-panel').forEach((panelEl) => {
    if (panelEl instanceof HTMLDetailsElement && isWorkspacePanelId(panelEl.id)) {
      result.add(panelEl.id);
    }
  });
  return result;
}

/** 조건 여부를 판별 */
export function isSameWorkspacePanelIdSet(
  a: Set<WorkspacePanelId>,
  b: Set<WorkspacePanelId>,
): boolean {
  if (a.size !== b.size) return false;
  for (const id of a) {
    if (!b.has(id)) return false;
  }
  return true;
}

/** 현재 workspace 루트 DOM 노드를 반환 */
export function getWorkspaceLayoutRootElement(
  panelContentEl: HTMLElement,
  workspaceDockPreviewEl: HTMLDivElement,
): HTMLElement | null {
  const candidate = Array.from(panelContentEl.children).find(
    (child) => child !== workspaceDockPreviewEl,
  );
  return candidate instanceof HTMLElement ? candidate : null;
}

/** 조건에 맞는 대상을 탐색 */
export function findReusableWorkspaceDomRoot(
  layoutNode: WorkspaceLayoutNode,
  existingRoot: HTMLElement | null,
): HTMLElement | null {
  if (!existingRoot) return null;

  const expectedIds = collectPanelIdsFromLayout(layoutNode);
  if (expectedIds.size === 0) return null;

  const currentIds = collectWorkspacePanelIdsFromDom(existingRoot);
  if (isSameWorkspacePanelIdSet(expectedIds, currentIds)) {
    return existingRoot;
  }

  if (!existingRoot.classList.contains('workspace-split')) {
    return null;
  }

  const firstRoot = existingRoot.querySelector<HTMLElement>(
    ':scope > .workspace-split-child-first > *',
  );
  const secondRoot = existingRoot.querySelector<HTMLElement>(
    ':scope > .workspace-split-child-second > *',
  );

  if (firstRoot) {
    const firstIds = collectWorkspacePanelIdsFromDom(firstRoot);
    if (isSameWorkspacePanelIdSet(expectedIds, firstIds)) {
      return firstRoot;
    }
  }
  if (secondRoot) {
    const secondIds = collectWorkspacePanelIdsFromDom(secondRoot);
    if (isSameWorkspacePanelIdSet(expectedIds, secondIds)) {
      return secondRoot;
    }
  }

  return null;
}
