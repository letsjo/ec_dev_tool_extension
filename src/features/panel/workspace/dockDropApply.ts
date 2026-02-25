import type { WorkspacePanelId } from '../workspacePanels';
import {
  appendPanelToWorkspaceLayout,
  createWorkspacePanelNode,
  insertPanelByDockTarget,
  removePanelFromWorkspaceLayout,
  swapWorkspaceLayoutPanels,
  type WorkspaceDropTarget,
  type WorkspaceLayoutNode,
} from './layoutModel';

export interface WorkspaceDockDropApplyResult {
  changed: boolean;
  layoutRoot: WorkspaceLayoutNode | null;
}

/**
 * 드래그 패널과 drop target 정보를 바탕으로 다음 workspace layout 트리를 계산한다.
 * DOM/persist는 호출부(manager)에서 처리한다.
 */
export function applyWorkspaceDockDropToLayout(
  currentLayoutRoot: WorkspaceLayoutNode | null,
  draggedPanelId: WorkspacePanelId,
  dropTarget: WorkspaceDropTarget,
): WorkspaceDockDropApplyResult {
  const targetPanelId = dropTarget.targetPanelId;
  if (!targetPanelId) {
    return { changed: false, layoutRoot: currentLayoutRoot };
  }
  if (draggedPanelId === targetPanelId) {
    return { changed: false, layoutRoot: currentLayoutRoot };
  }

  if (dropTarget.direction === 'center') {
    return {
      changed: true,
      layoutRoot: swapWorkspaceLayoutPanels(currentLayoutRoot, draggedPanelId, targetPanelId),
    };
  }

  const removed = removePanelFromWorkspaceLayout(currentLayoutRoot, draggedPanelId);
  const baseRoot = removed.node;
  const draggedNode = createWorkspacePanelNode(draggedPanelId);
  if (!baseRoot) {
    return {
      changed: true,
      layoutRoot: draggedNode,
    };
  }

  const inserted = insertPanelByDockTarget(
    baseRoot,
    targetPanelId,
    draggedNode,
    dropTarget.direction,
  );
  return {
    changed: true,
    layoutRoot: inserted.inserted
      ? inserted.node
      : appendPanelToWorkspaceLayout(baseRoot, draggedPanelId),
  };
}
