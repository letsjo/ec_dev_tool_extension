import { describe, expect, it } from 'vitest';
import {
  createWorkspacePanelNode,
  createWorkspaceSplitNode,
  type WorkspaceLayoutNode,
  type WorkspacePanelId,
} from '../../src/features/panel/workspace/layoutModel';
import { reconcileWorkspaceLayoutState } from '../../src/features/panel/workspace/layoutReconcile';

function readPanelOrder(node: WorkspaceLayoutNode | null, output: WorkspacePanelId[] = []) {
  if (!node) return output;
  if (node.type === 'panel') {
    output.push(node.panelId);
    return output;
  }
  readPanelOrder(node.first, output);
  readPanelOrder(node.second, output);
  return output;
}

describe('workspaceLayoutReconcile', () => {
  it('prunes hidden panels and dedupes repeated panel nodes', () => {
    const layout = createWorkspaceSplitNode(
      'row',
      createWorkspacePanelNode('componentsTreeSection'),
      createWorkspaceSplitNode(
        'column',
        createWorkspacePanelNode('componentsTreeSection'),
        createWorkspacePanelNode('componentsInspectorPanel'),
      ),
    );

    const result = reconcileWorkspaceLayoutState(
      layout,
      new Map([
        ['componentsTreeSection', 'closed'],
        ['componentsInspectorPanel', 'visible'],
      ]),
    );

    expect(readPanelOrder(result)).toEqual(['componentsInspectorPanel']);
  });

  it('appends visible panels that are missing from layout', () => {
    const result = reconcileWorkspaceLayoutState(
      null,
      new Map([
        ['componentsTreeSection', 'visible'],
        ['rawResultPanel', 'visible'],
      ]),
    );

    expect(readPanelOrder(result)).toEqual(['componentsTreeSection', 'rawResultPanel']);
  });
});
