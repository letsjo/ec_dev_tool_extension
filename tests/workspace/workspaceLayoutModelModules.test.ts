import { describe, expect, it } from 'vitest';
import {
  clampWorkspaceSplitRatio,
  createWorkspacePanelNode,
  createWorkspaceSplitNode,
  dedupeWorkspaceLayoutPanels,
  getWorkspaceVisiblePanelIds,
  parseWorkspaceLayoutNode,
  parseWorkspaceNodePath,
  pruneWorkspaceLayoutByVisiblePanels,
  stringifyWorkspaceNodePath,
} from '../../src/features/panel/workspace/layout/layoutModel';
import type { WorkspaceLayoutNode } from '../../src/features/panel/workspace/layout/layoutModel';
import type { WorkspacePanelId } from '../../src/features/panel/workspacePanels';

function readPanelIds(node: WorkspaceLayoutNode | null, output: WorkspacePanelId[] = []) {
  if (!node) return output;
  if (node.type === 'panel') {
    output.push(node.panelId);
    return output;
  }
  readPanelIds(node.first, output);
  readPanelIds(node.second, output);
  return output;
}

describe('workspace layout model modules', () => {
  it('parses and stringifies node path segments', () => {
    const parsed = parseWorkspaceNodePath('first.invalid.second.third.first');
    expect(parsed).toEqual(['first', 'second', 'first']);
    expect(stringifyWorkspaceNodePath(parsed)).toBe('first.second.first');
  });

  it('parses layout node recursively and clamps invalid ratio bounds', () => {
    const parsed = parseWorkspaceLayoutNode({
      type: 'split',
      axis: 'row',
      ratio: 0.99,
      first: {
        type: 'panel',
        panelId: 'componentsTreeSection',
      },
      second: {
        type: 'panel',
        panelId: 'componentsInspectorPanel',
      },
    });

    expect(parsed?.type).toBe('split');
    if (!parsed || parsed.type !== 'split') {
      throw new Error('parsed split is missing');
    }
    expect(parsed.ratio).toBe(clampWorkspaceSplitRatio(0.99));
    expect(parseWorkspaceLayoutNode({ type: 'panel', panelId: 'unknownPanel' })).toBeNull();
  });

  it('prunes invisible panels and deduplicates repeated panel nodes', () => {
    const duplicatedLayout = createWorkspaceSplitNode(
      'row',
      createWorkspacePanelNode('componentsTreeSection'),
      createWorkspaceSplitNode(
        'column',
        createWorkspacePanelNode('componentsTreeSection'),
        createWorkspacePanelNode('componentsInspectorPanel'),
      ),
    );
    const deduped = dedupeWorkspaceLayoutPanels(duplicatedLayout);
    expect(readPanelIds(deduped)).toEqual(['componentsTreeSection', 'componentsInspectorPanel']);

    const pruned = pruneWorkspaceLayoutByVisiblePanels(
      deduped,
      new Set<WorkspacePanelId>(['componentsInspectorPanel']),
    );
    expect(readPanelIds(pruned)).toEqual(['componentsInspectorPanel']);
  });

  it('returns visible panel ids in workspace panel list order', () => {
    const visibleIds = getWorkspaceVisiblePanelIds(
      new Map<WorkspacePanelId, 'visible' | 'closed'>([
        ['rawResultPanel', 'visible'],
        ['componentsTreeSection', 'visible'],
        ['selectedElementPanel', 'closed'],
      ]),
    );
    expect(visibleIds).toEqual(['componentsTreeSection', 'rawResultPanel']);
  });
});
