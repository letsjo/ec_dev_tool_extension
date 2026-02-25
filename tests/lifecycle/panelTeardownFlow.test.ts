import { describe, expect, it, vi } from 'vitest';
import { createPanelTeardownFlow } from '../../src/features/panel/lifecycle/panelTeardownFlow';

describe('createPanelTeardownFlow', () => {
  it('disposes workspace, wheel fallback, runtime scheduler and listener', () => {
    let workspaceLayoutManager: { destroy: () => void } | null = {
      destroy: vi.fn(),
    };
    let destroyWheelScrollFallback: (() => void) | null = vi.fn();
    let removeRuntimeMessageListener: (() => void) | null = vi.fn();
    const runtimeRefreshScheduler = {
      schedule: vi.fn(),
      refresh: vi.fn(),
      reset: vi.fn(),
      dispose: vi.fn(),
    };
    const removeNavigatedListener = vi.fn();

    const onPanelBeforeUnload = createPanelTeardownFlow({
      getWorkspaceLayoutManager: () => workspaceLayoutManager,
      setWorkspaceLayoutManager: (manager) => {
        workspaceLayoutManager = manager;
      },
      getDestroyWheelScrollFallback: () => destroyWheelScrollFallback,
      setDestroyWheelScrollFallback: (destroyer) => {
        destroyWheelScrollFallback = destroyer;
      },
      getRemoveRuntimeMessageListener: () => removeRuntimeMessageListener,
      setRemoveRuntimeMessageListener: (removeListener) => {
        removeRuntimeMessageListener = removeListener;
      },
      runtimeRefreshScheduler,
      removeNavigatedListener,
    });

    onPanelBeforeUnload();

    expect(workspaceLayoutManager).toBeNull();
    expect(destroyWheelScrollFallback).toBeNull();
    expect(removeRuntimeMessageListener).toBeNull();
    expect(runtimeRefreshScheduler.dispose).toHaveBeenCalledTimes(1);
    expect(removeNavigatedListener).toHaveBeenCalledTimes(1);
  });

  it('handles already-cleared resources safely', () => {
    let workspaceLayoutManager: { destroy: () => void } | null = null;
    let destroyWheelScrollFallback: (() => void) | null = null;
    let removeRuntimeMessageListener: (() => void) | null = null;
    const runtimeRefreshScheduler = {
      schedule: vi.fn(),
      refresh: vi.fn(),
      reset: vi.fn(),
      dispose: vi.fn(),
    };
    const removeNavigatedListener = vi.fn();

    const onPanelBeforeUnload = createPanelTeardownFlow({
      getWorkspaceLayoutManager: () => workspaceLayoutManager,
      setWorkspaceLayoutManager: (manager) => {
        workspaceLayoutManager = manager;
      },
      getDestroyWheelScrollFallback: () => destroyWheelScrollFallback,
      setDestroyWheelScrollFallback: (destroyer) => {
        destroyWheelScrollFallback = destroyer;
      },
      getRemoveRuntimeMessageListener: () => removeRuntimeMessageListener,
      setRemoveRuntimeMessageListener: (removeListener) => {
        removeRuntimeMessageListener = removeListener;
      },
      runtimeRefreshScheduler,
      removeNavigatedListener,
    });

    expect(() => onPanelBeforeUnload()).not.toThrow();
    expect(runtimeRefreshScheduler.dispose).toHaveBeenCalledTimes(1);
    expect(removeNavigatedListener).toHaveBeenCalledTimes(1);
  });
});
