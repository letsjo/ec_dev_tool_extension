import type { WorkspacePanelId } from '../workspacePanels';
import { createWorkspaceSplitNode, type WorkspaceLayoutNode } from './layoutTypes';

/** 이전 상태를 복원 */
function pruneWorkspaceLayoutByVisiblePanels(
  node: WorkspaceLayoutNode | null,
  visiblePanelIds: Set<WorkspacePanelId>,
): WorkspaceLayoutNode | null {
  if (!node) return null;
  if (node.type === 'panel') {
    return visiblePanelIds.has(node.panelId) ? node : null;
  }
  const first = pruneWorkspaceLayoutByVisiblePanels(node.first, visiblePanelIds);
  const second = pruneWorkspaceLayoutByVisiblePanels(node.second, visiblePanelIds);
  if (!first && !second) return null;
  if (!first) return second;
  if (!second) return first;
  return createWorkspaceSplitNode(node.axis, first, second, node.ratio);
}

/** 이전 상태를 복원 */
function dedupeWorkspaceLayoutPanels(
  node: WorkspaceLayoutNode | null,
  seen = new Set<WorkspacePanelId>(),
): WorkspaceLayoutNode | null {
  if (!node) return null;
  if (node.type === 'panel') {
    if (seen.has(node.panelId)) return null;
    seen.add(node.panelId);
    return node;
  }
  const first = dedupeWorkspaceLayoutPanels(node.first, seen);
  const second = dedupeWorkspaceLayoutPanels(node.second, seen);
  if (!first && !second) return null;
  if (!first) return second;
  if (!second) return first;
  return createWorkspaceSplitNode(node.axis, first, second, node.ratio);
}

export { dedupeWorkspaceLayoutPanels, pruneWorkspaceLayoutByVisiblePanels };
