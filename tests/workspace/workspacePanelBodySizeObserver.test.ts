import { afterEach, describe, expect, it, vi } from 'vitest';
import { createWorkspacePanelBodySizeObserver } from '../../src/features/panel/workspace/panelBodySizeObserver';
import type { WorkspacePanelId } from '../../src/features/panel/workspacePanels';

describe('workspacePanelBodySizeObserver', () => {
  const originalResizeObserver = globalThis.ResizeObserver;

  afterEach(() => {
    globalThis.ResizeObserver = originalResizeObserver;
    vi.restoreAllMocks();
  });

  it('observes panel content and workspace panels on start', () => {
    const observe = vi.fn();
    const disconnect = vi.fn();
    globalThis.ResizeObserver = class {
      constructor(_callback: ResizeObserverCallback) {}
      observe = observe;
      disconnect = disconnect;
    } as unknown as typeof ResizeObserver;

    const panelContentEl = document.createElement('section');
    const panelId: WorkspacePanelId = 'componentsTreeSection';
    const panelEl = document.createElement('details');
    const observerFlow = createWorkspacePanelBodySizeObserver({
      panelContentEl,
      workspacePanelElements: new Map([[panelId, panelEl]]),
      onResize: vi.fn(),
    });

    observerFlow.start();

    expect(observe).toHaveBeenCalledWith(panelContentEl);
    expect(observe).toHaveBeenCalledWith(panelEl);
    expect(disconnect).not.toHaveBeenCalled();
  });

  it('disconnects existing observer on stop and before restart', () => {
    const instances: Array<{ observe: ReturnType<typeof vi.fn>; disconnect: ReturnType<typeof vi.fn> }> = [];
    globalThis.ResizeObserver = class {
      observe = vi.fn();
      disconnect = vi.fn();
      constructor(_callback: ResizeObserverCallback) {
        instances.push(this);
      }
    } as unknown as typeof ResizeObserver;

    const observerFlow = createWorkspacePanelBodySizeObserver({
      panelContentEl: document.createElement('section'),
      workspacePanelElements: new Map(),
      onResize: vi.fn(),
    });

    observerFlow.start();
    observerFlow.start();
    observerFlow.stop();

    expect(instances.length).toBe(2);
    expect(instances[0].disconnect).toHaveBeenCalledTimes(1);
    expect(instances[1].disconnect).toHaveBeenCalledTimes(1);
  });
});
