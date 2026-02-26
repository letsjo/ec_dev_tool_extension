import { describe, expect, it, vi } from 'vitest';
import { createWorkspaceManagerLifecycle } from '../../src/features/panel/workspace/managerLifecycle';

describe('createWorkspaceManagerLifecycle', () => {
  it('runs init in restore->bind->observer->render order and rebinds on reinit', () => {
    const callOrder: string[] = [];
    const unbindFirst = vi.fn(() => {
      callOrder.push('unbind:first');
    });
    const unbindSecond = vi.fn(() => {
      callOrder.push('unbind:second');
    });
    const bindWorkspaceInteractions = vi
      .fn()
      .mockImplementationOnce(() => {
        callOrder.push('bind:first');
        return unbindFirst;
      })
      .mockImplementationOnce(() => {
        callOrder.push('bind:second');
        return unbindSecond;
      });

    const lifecycle = createWorkspaceManagerLifecycle({
      restoreWorkspaceState() {
        callOrder.push('restore');
      },
      bindWorkspaceInteractions,
      startWorkspacePanelBodySizeObserver() {
        callOrder.push('observer:start');
      },
      stopWorkspacePanelBodySizeObserver: vi.fn(),
      renderWorkspaceLayout() {
        callOrder.push('render');
      },
      stopWorkspaceSplitResize: vi.fn(),
      hideWorkspaceDockPreview: vi.fn(),
      onWorkspacePanelDragEnd: vi.fn(),
    });

    lifecycle.init();
    lifecycle.init();

    expect(callOrder).toEqual([
      'restore',
      'bind:first',
      'observer:start',
      'render',
      'restore',
      'unbind:first',
      'bind:second',
      'observer:start',
      'render',
    ]);
    expect(bindWorkspaceInteractions).toHaveBeenCalledTimes(2);
    expect(unbindFirst).toHaveBeenCalledTimes(1);
    expect(unbindSecond).not.toHaveBeenCalled();
  });

  it('releases active bindings and drag/resize state on destroy', () => {
    const unbindWorkspaceInteractions = vi.fn();
    const stopWorkspacePanelBodySizeObserver = vi.fn();
    const stopWorkspaceSplitResize = vi.fn();
    const hideWorkspaceDockPreview = vi.fn();
    const onWorkspacePanelDragEnd = vi.fn();

    const lifecycle = createWorkspaceManagerLifecycle({
      restoreWorkspaceState: vi.fn(),
      bindWorkspaceInteractions: () => unbindWorkspaceInteractions,
      startWorkspacePanelBodySizeObserver: vi.fn(),
      stopWorkspacePanelBodySizeObserver,
      renderWorkspaceLayout: vi.fn(),
      stopWorkspaceSplitResize,
      hideWorkspaceDockPreview,
      onWorkspacePanelDragEnd,
    });

    lifecycle.init();
    lifecycle.destroy();
    lifecycle.destroy();

    expect(unbindWorkspaceInteractions).toHaveBeenCalledTimes(1);
    expect(stopWorkspacePanelBodySizeObserver).toHaveBeenCalledTimes(2);
    expect(stopWorkspaceSplitResize).toHaveBeenCalledWith(false);
    expect(hideWorkspaceDockPreview).toHaveBeenCalledTimes(2);
    expect(onWorkspacePanelDragEnd).toHaveBeenCalledTimes(2);
  });
});
