import type { WorkspacePanelId } from '../../workspacePanels';
import {
  createWorkspacePanelNode,
  createWorkspaceSplitNode,
  type WorkspaceLayoutNode,
} from './layoutTypes';

/** 파생 데이터나 요약 값을 구성 */
function collectPanelIdsFromLayout(
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

/** 파생 데이터나 요약 값을 구성 */
function appendPanelToWorkspaceLayout(
  node: WorkspaceLayoutNode | null,
  panelId: WorkspacePanelId,
): WorkspaceLayoutNode {
  const panelNode = createWorkspacePanelNode(panelId);
  if (!node) return panelNode;
  return createWorkspaceSplitNode('column', node, panelNode, 0.72);
}

export { appendPanelToWorkspaceLayout, collectPanelIdsFromLayout };
