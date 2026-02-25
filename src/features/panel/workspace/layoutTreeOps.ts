import type { WorkspacePanelId } from '../workspacePanels';
import {
  createWorkspacePanelNode,
  createWorkspaceSplitNode,
  type WorkspaceDockDirection,
  type WorkspaceLayoutNode,
  type WorkspacePanelLayoutNode,
  type WorkspaceNodePath,
} from './layoutTypes';

/** 파생 데이터나 요약 값을 구성 */
export function collectPanelIdsFromLayout(
  node: WorkspaceLayoutNode | null,
  output = new Set<WorkspacePanelId>(),
): Set<WorkspacePanelId> {
  if (!node) return output;
  if (node.type === 'panel') {
    output.add(node.panelId);
    return output;
  }
  collectPanelIdsFromLayout(node.first, output);
  collectPanelIdsFromLayout(node.second, output);
  return output;
}

/** 현재 상태 스냅샷을 만든 */
export function removePanelFromWorkspaceLayout(
  node: WorkspaceLayoutNode | null,
  panelId: WorkspacePanelId,
): { node: WorkspaceLayoutNode | null; removed: boolean } {
  if (!node) return { node: null, removed: false };
  if (node.type === 'panel') {
    if (node.panelId === panelId) {
      return { node: null, removed: true };
    }
    return { node, removed: false };
  }

  const firstResult = removePanelFromWorkspaceLayout(node.first, panelId);
  if (firstResult.removed) {
    if (!firstResult.node) return { node: node.second, removed: true };
    return {
      node: createWorkspaceSplitNode(node.axis, firstResult.node, node.second, node.ratio),
      removed: true,
    };
  }

  const secondResult = removePanelFromWorkspaceLayout(node.second, panelId);
  if (secondResult.removed) {
    if (!secondResult.node) return { node: node.first, removed: true };
    return {
      node: createWorkspaceSplitNode(node.axis, node.first, secondResult.node, node.ratio),
      removed: true,
    };
  }
  return { node, removed: false };
}

/** 파생 데이터나 요약 값을 구성 */
export function appendPanelToWorkspaceLayout(
  node: WorkspaceLayoutNode | null,
  panelId: WorkspacePanelId,
): WorkspaceLayoutNode {
  const panelNode = createWorkspacePanelNode(panelId);
  if (!node) return panelNode;
  return createWorkspaceSplitNode('column', node, panelNode, 0.72);
}

/** 조건에 맞는 대상을 탐색 */
export function insertPanelByDockTarget(
  node: WorkspaceLayoutNode,
  targetPanelId: WorkspacePanelId,
  panelNode: WorkspacePanelLayoutNode,
  direction: Exclude<WorkspaceDockDirection, 'center'>,
): { node: WorkspaceLayoutNode; inserted: boolean } {
  if (node.type === 'panel') {
    if (node.panelId !== targetPanelId) return { node, inserted: false };
    const axis = direction === 'left' || direction === 'right' ? 'row' : 'column';
    const inserted =
      direction === 'left' || direction === 'top'
        ? createWorkspaceSplitNode(axis, panelNode, node)
        : createWorkspaceSplitNode(axis, node, panelNode);
    return { node: inserted, inserted: true };
  }

  const firstResult = insertPanelByDockTarget(node.first, targetPanelId, panelNode, direction);
  if (firstResult.inserted) {
    return {
      node: createWorkspaceSplitNode(node.axis, firstResult.node, node.second, node.ratio),
      inserted: true,
    };
  }

  const secondResult = insertPanelByDockTarget(node.second, targetPanelId, panelNode, direction);
  if (secondResult.inserted) {
    return {
      node: createWorkspaceSplitNode(node.axis, node.first, secondResult.node, node.ratio),
      inserted: true,
    };
  }

  return { node, inserted: false };
}

/** 파생 데이터나 요약 값을 구성 */
export function swapWorkspaceLayoutPanels(
  node: WorkspaceLayoutNode | null,
  panelIdA: WorkspacePanelId,
  panelIdB: WorkspacePanelId,
): WorkspaceLayoutNode | null {
  if (!node) return null;
  if (node.type === 'panel') {
    if (node.panelId === panelIdA) return createWorkspacePanelNode(panelIdB);
    if (node.panelId === panelIdB) return createWorkspacePanelNode(panelIdA);
    return node;
  }
  return createWorkspaceSplitNode(
    node.axis,
    swapWorkspaceLayoutPanels(node.first, panelIdA, panelIdB) ?? node.first,
    swapWorkspaceLayoutPanels(node.second, panelIdA, panelIdB) ?? node.second,
    node.ratio,
  );
}

/** 계산/조회 결과를 UI 상태에 반영 */
export function updateWorkspaceSplitRatioByPath(
  node: WorkspaceLayoutNode | null,
  path: WorkspaceNodePath,
  ratio: number,
): WorkspaceLayoutNode | null {
  if (!node) return null;
  if (path.length === 0) {
    if (node.type !== 'split') return node;
    return createWorkspaceSplitNode(node.axis, node.first, node.second, ratio);
  }
  if (node.type !== 'split') return node;

  const [head, ...rest] = path;
  if (head === 'first') {
    const nextFirst = updateWorkspaceSplitRatioByPath(node.first, rest, ratio) ?? node.first;
    return createWorkspaceSplitNode(node.axis, nextFirst, node.second, node.ratio);
  }
  const nextSecond = updateWorkspaceSplitRatioByPath(node.second, rest, ratio) ?? node.second;
  return createWorkspaceSplitNode(node.axis, node.first, nextSecond, node.ratio);
}

/** 이전 상태를 복원 */
export function pruneWorkspaceLayoutByVisiblePanels(
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
export function dedupeWorkspaceLayoutPanels(
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
