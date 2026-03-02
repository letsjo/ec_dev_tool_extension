import { describe, expect, it, vi } from 'vitest';
import { createElementPickerBridgeFlow } from '../../src/features/panel/elementPicker/bridgeFlow';

describe('elementPickerBridgeFlow', () => {
  it('resets runtime refresh and triggers dom/react fetch on elementSelected', () => {
    const clearPageHoverPreview = vi.fn();
    const setPickerModeActive = vi.fn();
    const setElementOutput = vi.fn();
    const fetchDomTree = vi.fn();
    const fetchReactInfoForElementSelection = vi.fn();
    const resetRuntimeRefresh = vi.fn();

    const flow = createElementPickerBridgeFlow({
      getInspectedTabId: () => 7,
      clearPageHoverPreview,
      setPickerModeActive,
      setElementOutput,
      setReactStatus: vi.fn(),
      setDomTreeStatus: vi.fn(),
      setDomTreeEmpty: vi.fn(),
      fetchDomTree,
      fetchReactInfoForElementSelection,
      resetRuntimeRefresh,
      scheduleRuntimeRefresh: vi.fn(),
    });

    flow.onRuntimeMessage({
      action: 'elementSelected',
      tabId: 7,
      elementInfo: {
        tagName: 'button',
        selector: '.target',
        domPath: 'html > body > .target',
        clickPoint: { x: 10, y: 20 },
      },
    });

    expect(clearPageHoverPreview).toHaveBeenCalledTimes(1);
    expect(setPickerModeActive).toHaveBeenCalledWith(false);
    expect(resetRuntimeRefresh).toHaveBeenCalledTimes(1);
    expect(setElementOutput).toHaveBeenCalledTimes(1);
    expect(fetchDomTree).toHaveBeenCalledWith(
      '.target',
      { x: 10, y: 20 },
      'html > body > .target',
    );
    expect(fetchReactInfoForElementSelection).toHaveBeenCalledWith('.target', { x: 10, y: 20 });
  });

  it('schedules background refresh on pageRuntimeChanged message', () => {
    const scheduleRuntimeRefresh = vi.fn();
    const flow = createElementPickerBridgeFlow({
      getInspectedTabId: () => 11,
      clearPageHoverPreview: vi.fn(),
      setPickerModeActive: vi.fn(),
      setElementOutput: vi.fn(),
      setReactStatus: vi.fn(),
      setDomTreeStatus: vi.fn(),
      setDomTreeEmpty: vi.fn(),
      fetchDomTree: vi.fn(),
      fetchReactInfoForElementSelection: vi.fn(),
      resetRuntimeRefresh: vi.fn(),
      scheduleRuntimeRefresh,
    });

    flow.onRuntimeMessage({
      action: 'pageRuntimeChanged',
      tabId: 11,
    });

    expect(scheduleRuntimeRefresh).toHaveBeenCalledTimes(1);
  });

  it('sends picker shortcut control actions through runtime bridge', () => {
    const originalChrome = (globalThis as { chrome?: unknown }).chrome;
    const sendMessage = vi.fn((_payload: unknown, callback?: (response: { ok: boolean }) => void) => {
      callback?.({ ok: true });
    });
    try {
      (globalThis as { chrome?: unknown }).chrome = {
        runtime: {
          sendMessage,
          lastError: undefined,
        },
      };

      const flow = createElementPickerBridgeFlow({
        getInspectedTabId: () => 5,
        clearPageHoverPreview: vi.fn(),
        setPickerModeActive: vi.fn(),
        setElementOutput: vi.fn(),
        setReactStatus: vi.fn(),
        setDomTreeStatus: vi.fn(),
        setDomTreeEmpty: vi.fn(),
        fetchDomTree: vi.fn(),
        fetchReactInfoForElementSelection: vi.fn(),
        resetRuntimeRefresh: vi.fn(),
        scheduleRuntimeRefresh: vi.fn(),
      });

      flow.onConfirmElementByShortcut();
      flow.onCancelElementByShortcut();

      expect(sendMessage).toHaveBeenNthCalledWith(
        1,
        { action: 'confirmElementPickerSelection', tabId: 5 },
        expect.any(Function),
      );
      expect(sendMessage).toHaveBeenNthCalledWith(
        2,
        { action: 'cancelElementPicker', tabId: 5 },
        expect.any(Function),
      );
    } finally {
      (globalThis as { chrome?: unknown }).chrome = originalChrome;
    }
  });
});
