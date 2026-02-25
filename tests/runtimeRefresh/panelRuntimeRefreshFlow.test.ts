import { describe, expect, it, vi } from 'vitest';
import type { RuntimeRefreshLookup } from '../../src/features/panel/reactInspector/lookup';
import type { RuntimeRefreshScheduler } from '../../src/features/panel/runtimeRefresh/scheduler';
import { createPanelRuntimeRefreshFlow } from '../../src/features/panel/runtimeRefresh/panelRuntimeRefreshFlow';

function createSchedulerStub(): RuntimeRefreshScheduler {
  return {
    schedule: vi.fn(),
    refresh: vi.fn(),
    reset: vi.fn(),
    dispose: vi.fn(),
  };
}

describe('createPanelRuntimeRefreshFlow', () => {
  it('wires lookup resolver and runRefresh into scheduler options', () => {
    let storedLookup: RuntimeRefreshLookup | null = {
      selector: '#saved',
    };
    const scheduler = createSchedulerStub();
    let capturedSchedulerOptions: any = null;
    const createRuntimeRefreshScheduler = vi.fn((schedulerOptions: any) => {
      capturedSchedulerOptions = schedulerOptions;
      return scheduler;
    });
    const resolveRuntimeRefreshLookup = vi.fn(
      (lookup: RuntimeRefreshLookup | null): RuntimeRefreshLookup =>
        lookup ?? { selector: '' },
    );
    const runRefresh = vi.fn();

    createPanelRuntimeRefreshFlow(
      {
        isPickerModeActive: () => false,
        getStoredLookup: () => storedLookup,
        setStoredLookup: (lookup) => {
          storedLookup = lookup;
        },
        runRefresh,
        setElementOutput: vi.fn(),
        setDomTreeStatus: vi.fn(),
        setDomTreeEmpty: vi.fn(),
      },
      {
        resolveRuntimeRefreshLookup,
        createRuntimeRefreshScheduler,
      },
    );

    expect(createRuntimeRefreshScheduler).toHaveBeenCalledWith(
      expect.objectContaining({
        minIntervalMs: 1200,
        debounceMs: 250,
      }),
    );
    expect(capturedSchedulerOptions.getLookup()).toEqual({ selector: '#saved' });
    expect(resolveRuntimeRefreshLookup).toHaveBeenCalledWith({ selector: '#saved' });

    storedLookup = null;
    expect(capturedSchedulerOptions.getLookup()).toEqual({ selector: '' });

    const onDone = vi.fn();
    capturedSchedulerOptions.runRefresh({ selector: '#next' }, true, onDone);
    expect(runRefresh).toHaveBeenCalledWith({ selector: '#next' }, true, onDone);
  });

  it('resets lookup and triggers immediate foreground refresh on navigation', () => {
    let storedLookup: RuntimeRefreshLookup | null = { selector: '#saved' };
    const scheduler = createSchedulerStub();
    const setElementOutput = vi.fn();
    const setDomTreeStatus = vi.fn();
    const setDomTreeEmpty = vi.fn();

    const flow = createPanelRuntimeRefreshFlow(
      {
        isPickerModeActive: () => false,
        getStoredLookup: () => storedLookup,
        setStoredLookup: (lookup) => {
          storedLookup = lookup;
        },
        runRefresh: vi.fn(),
        setElementOutput,
        setDomTreeStatus,
        setDomTreeEmpty,
      },
      {
        resolveRuntimeRefreshLookup: (lookup) => lookup ?? { selector: '' },
        createRuntimeRefreshScheduler: vi.fn(() => scheduler),
      },
    );

    flow.onInspectedPageNavigated('https://example.com/path');

    expect(storedLookup).toBeNull();
    expect(scheduler.reset).toHaveBeenCalledTimes(1);
    expect(setElementOutput).toHaveBeenCalledWith(
      '페이지 이동 감지: https://example.com/path',
    );
    expect(setDomTreeStatus).toHaveBeenCalledWith(
      '페이지 변경 감지됨. 요소를 선택하면 DOM 트리를 표시합니다.',
    );
    expect(setDomTreeEmpty).toHaveBeenCalledWith(
      '요소를 선택하면 DOM 트리를 표시합니다.',
    );
    expect(scheduler.refresh).toHaveBeenCalledWith(false);
  });
});
