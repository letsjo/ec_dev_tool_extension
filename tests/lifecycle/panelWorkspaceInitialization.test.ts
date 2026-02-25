import { describe, expect, it, vi } from 'vitest';
import { createPanelWorkspaceInitialization } from '../../src/features/panel/lifecycle/panelWorkspaceInitialization';

describe('createPanelWorkspaceInitialization', () => {
  it('creates workspace manager and wheel fallback destroyer', () => {
    const panelWorkspaceEl = document.createElement('section');
    const panelContentEl = document.createElement('div');
    const workspacePanelToggleBarEl = document.createElement('div');
    const workspaceDockPreviewEl = document.createElement('div');
    const workspacePanelElements = new Map();

    const workspaceManager = {
      destroy: vi.fn(),
    };
    const createWorkspaceLayoutManager = vi.fn(() => workspaceManager);
    const wheelDestroyer = vi.fn();
    const initWheelScrollFallback = vi.fn(() => wheelDestroyer);

    let storedWorkspaceManager: unknown = null;
    let storedWheelDestroyer: unknown = null;

    const flow = createPanelWorkspaceInitialization({
      getPanelWorkspaceEl: () => panelWorkspaceEl,
      getPanelContentEl: () => panelContentEl,
      getWorkspacePanelToggleBarEl: () => workspacePanelToggleBarEl,
      getWorkspaceDockPreviewEl: () => workspaceDockPreviewEl,
      getWorkspacePanelElements: () => workspacePanelElements,
      createWorkspaceLayoutManager,
      initWheelScrollFallback,
      setWorkspaceLayoutManager: (manager) => {
        storedWorkspaceManager = manager;
      },
      setDestroyWheelScrollFallback: (destroyer) => {
        storedWheelDestroyer = destroyer;
      },
    });

    flow.initializeWorkspaceLayout();
    flow.initializeWheelFallback();

    expect(createWorkspaceLayoutManager).toHaveBeenCalledWith({
      panelContentEl,
      workspacePanelToggleBarEl,
      workspaceDockPreviewEl,
      workspacePanelElements,
    });
    expect(storedWorkspaceManager).toBe(workspaceManager);

    expect(initWheelScrollFallback).toHaveBeenCalledWith(panelWorkspaceEl);
    expect(storedWheelDestroyer).toBe(wheelDestroyer);
  });
});
