import { describe, expect, it } from 'vitest';
import { applyWorkspaceDockDropToLayout } from '../../src/features/panel/workspace/dockDropApply';
import { resolveWorkspaceDragOverTarget } from '../../src/features/panel/workspace/dragOverTarget';
import {
  collectPanelIdsFromLayout,
  createWorkspacePanelNode,
  createWorkspaceSplitNode,
  type WorkspaceLayoutNode,
} from '../../src/features/panel/workspace/layout/layoutModel';

function readPanelOrder(node: WorkspaceLayoutNode | null, output: string[] = []): string[] {
  if (!node) return output;
  if (node.type === 'panel') {
    output.push(node.panelId);
    return output;
  }
  readPanelOrder(node.first, output);
  readPanelOrder(node.second, output);
  return output;
}

describe('resolveWorkspaceDragOverTarget', () => {
  it('falls back to center drop when no panel is under pointer', () => {
    const panelContentEl = document.createElement('section');
    const contentRect = new DOMRect(0, 0, 400, 300);
    panelContentEl.getBoundingClientRect = () => contentRect;

    const result = resolveWorkspaceDragOverTarget({
      panelContentEl,
      clientX: 200,
      clientY: 100,
      findWorkspacePanelByPoint: () => null,
      computeWorkspaceDockDirection: () => 'center',
    });

    expect(result.dropTarget).toEqual({
      targetPanelId: null,
      direction: 'center',
    });
    expect(result.previewRect).toBe(contentRect);
  });

  it('uses panel id and computed direction when pointer is over panel', () => {
    const panelContentEl = document.createElement('section');
    const panelEl = document.createElement('details');
    panelEl.id = 'componentsInspectorPanel';
    const panelRect = new DOMRect(12, 16, 220, 120);
    panelEl.getBoundingClientRect = () => panelRect;

    const result = resolveWorkspaceDragOverTarget({
      panelContentEl,
      clientX: 30,
      clientY: 50,
      findWorkspacePanelByPoint: () => panelEl,
      computeWorkspaceDockDirection: () => 'top',
    });

    expect(result.dropTarget).toEqual({
      targetPanelId: 'componentsInspectorPanel',
      direction: 'top',
    });
    expect(result.previewRect).toBe(panelRect);
  });
});

describe('applyWorkspaceDockDropToLayout', () => {
  const baseLayout = createWorkspaceSplitNode(
    'row',
    createWorkspacePanelNode('componentsTreeSection'),
    createWorkspacePanelNode('componentsInspectorPanel'),
  );

  it('returns unchanged layout when drop target panel is missing', () => {
    const result = applyWorkspaceDockDropToLayout(baseLayout, 'componentsTreeSection', {
      targetPanelId: null,
      direction: 'center',
    });

    expect(result.changed).toBe(false);
    expect(result.layoutRoot).toBe(baseLayout);
  });

  it('swaps panel positions on center drop', () => {
    const result = applyWorkspaceDockDropToLayout(baseLayout, 'componentsTreeSection', {
      targetPanelId: 'componentsInspectorPanel',
      direction: 'center',
    });

    expect(result.changed).toBe(true);
    expect(readPanelOrder(result.layoutRoot)).toEqual([
      'componentsInspectorPanel',
      'componentsTreeSection',
    ]);
  });

  it('inserts dragged panel around target for edge dock', () => {
    const result = applyWorkspaceDockDropToLayout(baseLayout, 'componentsTreeSection', {
      targetPanelId: 'componentsInspectorPanel',
      direction: 'left',
    });

    expect(result.changed).toBe(true);
    expect(readPanelOrder(result.layoutRoot)).toEqual([
      'componentsTreeSection',
      'componentsInspectorPanel',
    ]);
  });

  it('appends dragged panel when target panel does not exist in tree', () => {
    const result = applyWorkspaceDockDropToLayout(baseLayout, 'selectedElementPanel', {
      targetPanelId: 'rawResultPanel',
      direction: 'bottom',
    });

    expect(result.changed).toBe(true);
    expect(result.layoutRoot).not.toBeNull();
    expect(
      collectPanelIdsFromLayout(result.layoutRoot).has('selectedElementPanel'),
    ).toBe(true);
    expect(readPanelOrder(result.layoutRoot)).toEqual([
      'componentsTreeSection',
      'componentsInspectorPanel',
      'selectedElementPanel',
    ]);
  });
});
