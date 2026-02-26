import type { WorkspacePanelId } from '../../workspacePanels';
import {
  appendPanelToWorkspaceLayout,
  collectPanelIdsFromLayout,
  dedupeWorkspaceLayoutPanels,
  getWorkspaceVisiblePanelIds,
  pruneWorkspaceLayoutByVisiblePanels,
  type WorkspaceLayoutNode,
  type WorkspacePanelState,
} from './layoutModel';

/** workspace visible panel 상태와 layout tree를 정합성 있게 재구성한다. */
export function reconcileWorkspaceLayoutState(
  workspaceLayoutRoot: WorkspaceLayoutNode | null,
  workspacePanelStateById: ReadonlyMap<WorkspacePanelId, WorkspacePanelState>,
): WorkspaceLayoutNode | null {
  const visiblePanelIds = getWorkspaceVisiblePanelIds(workspacePanelStateById);
  const visiblePanelSet = new Set<WorkspacePanelId>(visiblePanelIds);
  let nextLayoutRoot = dedupeWorkspaceLayoutPanels(
    pruneWorkspaceLayoutByVisiblePanels(workspaceLayoutRoot, visiblePanelSet),
  );

  visiblePanelIds.forEach((panelId) => {
    const idsInLayout = collectPanelIdsFromLayout(nextLayoutRoot);
    if (!idsInLayout.has(panelId)) {
      nextLayoutRoot = appendPanelToWorkspaceLayout(nextLayoutRoot, panelId);
    }
  });

  return nextLayoutRoot;
}
