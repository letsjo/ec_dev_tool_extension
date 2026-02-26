import { describe, expect, it } from 'vitest';
import { appendPanelToWorkspaceLayout, collectPanelIdsFromLayout } from '../../src/features/panel/workspace/layout/layoutTreeCollect';
import { dedupeWorkspaceLayoutPanels, pruneWorkspaceLayoutByVisiblePanels } from '../../src/features/panel/workspace/layout/layoutTreeNormalize';
import {
  insertPanelByDockTarget,
  removePanelFromWorkspaceLayout,
  updateWorkspaceSplitRatioByPath,
} from '../../src/features/panel/workspace/layout/layoutTreeTransform';
import {
  createWorkspacePanelNode,
  createWorkspaceSplitNode,
} from '../../src/features/panel/workspace/layout/layoutTypes';

describe('workspace layout tree modules', () => {
  it('collects panel ids and appends panel as column split', () => {
    const base = createWorkspacePanelNode('componentsTreeSection');
    const appended = appendPanelToWorkspaceLayout(base, 'rawResultPanel');
    const ids = collectPanelIdsFromLayout(appended);

    expect(ids.has('componentsTreeSection')).toBe(true);
    expect(ids.has('rawResultPanel')).toBe(true);
    expect(appended.type).toBe('split');
    expect(appended.axis).toBe('column');
  });

  it('removes panel and collapses split branch', () => {
    const layout = createWorkspaceSplitNode(
      'row',
      createWorkspacePanelNode('componentsTreeSection'),
      createWorkspacePanelNode('rawResultPanel'),
    );

    const result = removePanelFromWorkspaceLayout(layout, 'componentsTreeSection');

    expect(result.removed).toBe(true);
    expect(result.node).toEqual(createWorkspacePanelNode('rawResultPanel'));
  });

  it('inserts panel by dock target and updates split ratio by path', () => {
    const base = createWorkspaceSplitNode(
      'row',
      createWorkspacePanelNode('componentsTreeSection'),
      createWorkspacePanelNode('rawResultPanel'),
    );

    const inserted = insertPanelByDockTarget(
      base,
      'rawResultPanel',
      createWorkspacePanelNode('selectedElementPanel'),
      'left',
    );

    expect(inserted.inserted).toBe(true);
    expect(inserted.node.type).toBe('split');

    const ratioUpdated = updateWorkspaceSplitRatioByPath(inserted.node, ['second'], 0.7);
    expect(ratioUpdated && ratioUpdated.type).toBe('split');
    if (ratioUpdated && ratioUpdated.type === 'split') {
      expect(ratioUpdated.second.type).toBe('split');
      if (ratioUpdated.second.type === 'split') {
        expect(ratioUpdated.second.ratio).toBeGreaterThan(0.6);
      }
    }
  });

  it('prunes hidden panels and dedupes duplicated panel ids', () => {
    const duplicated = createWorkspaceSplitNode(
      'column',
      createWorkspacePanelNode('componentsTreeSection'),
      createWorkspaceSplitNode(
        'column',
        createWorkspacePanelNode('componentsTreeSection'),
        createWorkspacePanelNode('rawResultPanel'),
      ),
    );

    const deduped = dedupeWorkspaceLayoutPanels(duplicated);
    const pruned = pruneWorkspaceLayoutByVisiblePanels(
      deduped,
      new Set(['componentsTreeSection'] as const),
    );

    expect(collectPanelIdsFromLayout(deduped)).toEqual(new Set(['componentsTreeSection', 'rawResultPanel']));
    expect(pruned).toEqual(createWorkspacePanelNode('componentsTreeSection'));
  });
});
