import { describe, expect, it, vi } from 'vitest';
import type { PanelControllerContext } from '../../src/features/panel/controller/context';
import { createPanelRuntimePickerFlow } from '../../src/features/panel/controller/runtimePickerFlow';
import type { RuntimeRefreshScheduler } from '../../src/features/panel/runtimeRefresh/scheduler';

function createContextStub() {
  return {
    isPickerModeActive: vi.fn(() => true),
    setPickerModeActive: vi.fn(),
    setRemoveRuntimeMessageListener: vi.fn(),
  } as unknown as PanelControllerContext;
}

function createSchedulerStub(): RuntimeRefreshScheduler {
  return {
    schedule: vi.fn(),
    refresh: vi.fn(),
    reset: vi.fn(),
    dispose: vi.fn(),
  };
}

describe('createPanelRuntimePickerFlow', () => {
  it('wires picker flow and runtime message listener with scheduler hooks', () => {
    const panelControllerContext = createContextStub();
    const runtimeRefreshScheduler = createSchedulerStub();
    const appendDebugLog = vi.fn();
    const removeRuntimeMessageListener = vi.fn();
    const onSelectElement = vi.fn();
    const onConfirmElementByShortcut = vi.fn();
    const onCancelElementByShortcut = vi.fn();
    const onRuntimeMessage = vi.fn();
    let capturedPickerOptions: any = null;

    const bindings = createPanelRuntimePickerFlow(
      {
        panelControllerContext,
        runtimeRefreshScheduler,
        getInspectedTabId: vi.fn(() => 1),
        clearPageHoverPreview: vi.fn(),
        fetchReactInfoForElementSelection: vi.fn(),
        fetchDomTree: vi.fn(),
        setElementOutput: vi.fn(),
        setReactStatus: vi.fn(),
        setDomTreeStatus: vi.fn(),
        setDomTreeEmpty: vi.fn(),
        appendDebugLog,
      },
      {
        createElementPickerBridgeFlow: vi.fn((options: any) => {
          capturedPickerOptions = options;
          return {
            onSelectElement,
            onConfirmElementByShortcut,
            onCancelElementByShortcut,
            onRuntimeMessage,
          };
        }),
        bindRuntimeMessageListener: vi.fn(() => removeRuntimeMessageListener),
      },
    );

    expect(bindings.onSelectElement).toBe(onSelectElement);
    bindings.onPickerShortcutKeyDown(
      new KeyboardEvent('keydown', { key: 'Enter', cancelable: true, bubbles: true }),
    );
    bindings.onPickerShortcutKeyDown(
      new KeyboardEvent('keydown', { key: 'Escape', cancelable: true, bubbles: true }),
    );
    expect(onConfirmElementByShortcut).toHaveBeenCalledTimes(1);
    expect(onCancelElementByShortcut).toHaveBeenCalledTimes(1);
    capturedPickerOptions.scheduleRuntimeRefresh();
    capturedPickerOptions.resetRuntimeRefresh();
    expect(runtimeRefreshScheduler.schedule).toHaveBeenCalledWith(true);
    expect(runtimeRefreshScheduler.reset).toHaveBeenCalledTimes(1);
    expect(appendDebugLog).toHaveBeenCalledWith('runtimeRefresh.schedule', {
      background: true,
    });
    expect(appendDebugLog).toHaveBeenCalledWith('runtimeRefresh.reset');

    expect(panelControllerContext.setRemoveRuntimeMessageListener).toHaveBeenCalledWith(
      removeRuntimeMessageListener,
    );
  });

  it('ignores Enter/Escape shortcuts when picker mode is inactive', () => {
    const panelControllerContext = {
      isPickerModeActive: vi.fn(() => false),
      setPickerModeActive: vi.fn(),
      setRemoveRuntimeMessageListener: vi.fn(),
    } as unknown as PanelControllerContext;
    const runtimeRefreshScheduler = createSchedulerStub();
    const onConfirmElementByShortcut = vi.fn();
    const onCancelElementByShortcut = vi.fn();

    const bindings = createPanelRuntimePickerFlow(
      {
        panelControllerContext,
        runtimeRefreshScheduler,
        getInspectedTabId: vi.fn(() => 1),
        clearPageHoverPreview: vi.fn(),
        fetchReactInfoForElementSelection: vi.fn(),
        fetchDomTree: vi.fn(),
        setElementOutput: vi.fn(),
        setReactStatus: vi.fn(),
        setDomTreeStatus: vi.fn(),
        setDomTreeEmpty: vi.fn(),
      },
      {
        createElementPickerBridgeFlow: vi.fn(() => ({
          onSelectElement: vi.fn(),
          onConfirmElementByShortcut,
          onCancelElementByShortcut,
          onRuntimeMessage: vi.fn(),
        })),
        bindRuntimeMessageListener: vi.fn(() => vi.fn()),
      },
    );

    bindings.onPickerShortcutKeyDown(new KeyboardEvent('keydown', { key: 'Enter' }));
    bindings.onPickerShortcutKeyDown(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(onConfirmElementByShortcut).not.toHaveBeenCalled();
    expect(onCancelElementByShortcut).not.toHaveBeenCalled();
  });
});
