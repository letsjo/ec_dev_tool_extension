import { describe, expect, it, vi } from 'vitest';
import { renderWorkspaceLayoutPipeline } from '../../src/features/panel/workspace/render/renderPipeline';

describe('renderWorkspaceLayoutPipeline', () => {
  it('reuses existing empty placeholder and clears stale nodes when layout is empty', () => {
    const panelContentEl = document.createElement('section');
    const workspaceDockPreviewEl = document.createElement('div');
    const existingEmpty = document.createElement('div');
    existingEmpty.className = 'workspace-empty';
    const stale = document.createElement('aside');
    panelContentEl.append(workspaceDockPreviewEl, existingEmpty, stale);

    const hideWorkspaceDockPreview = vi.fn();

    const result = renderWorkspaceLayoutPipeline({
      panelContentEl,
      workspaceDockPreviewEl,
      workspaceLayoutRoot: null,
      workspacePanelElements: new Map(),
      hideWorkspaceDockPreview,
      getWorkspaceLayoutRootElement: () => existingEmpty,
    });

    expect(result).toEqual({ hasLayoutRoot: false });
    expect(hideWorkspaceDockPreview).toHaveBeenCalledWith(workspaceDockPreviewEl);
    expect(panelContentEl.children).toHaveLength(2);
    expect(panelContentEl.children[0]).toBe(workspaceDockPreviewEl);
    expect(panelContentEl.children[1]).toBe(existingEmpty);
  });

  it('patches layout root and positions rendered root after dock preview', () => {
    const panelContentEl = document.createElement('section');
    const workspaceDockPreviewEl = document.createElement('div');
    const stale = document.createElement('aside');
    panelContentEl.append(stale);

    const patchedRoot = document.createElement('div');
    patchedRoot.className = 'workspace-root';

    const layoutRoot = {
      type: 'panel',
      panelId: 'componentsTreeSection',
    } as unknown;

    const patchWorkspaceLayoutDomNode = vi.fn(() => patchedRoot);

    const result = renderWorkspaceLayoutPipeline({
      panelContentEl,
      workspaceDockPreviewEl,
      workspaceLayoutRoot: layoutRoot as any,
      workspacePanelElements: new Map(),
      patchWorkspaceLayoutDomNode,
      getWorkspaceLayoutRootElement: () => null,
      hideWorkspaceDockPreview: vi.fn(),
    });

    expect(result).toEqual({ hasLayoutRoot: true });
    expect(patchWorkspaceLayoutDomNode).toHaveBeenCalledTimes(1);
    expect(panelContentEl.children).toHaveLength(2);
    expect(panelContentEl.children[0]).toBe(workspaceDockPreviewEl);
    expect(panelContentEl.children[1]).toBe(patchedRoot);
  });
});
