import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createElementPickerBridgeFlow } from '../../src/features/panel/elementPicker/bridgeFlow';

describe('elementPickerBridgeFlow', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

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
      isPickerModeActive: () => true,
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

  it('updates selected element and selected DOM tree on elementPreviewed while picker is active', () => {
    const setElementOutput = vi.fn();
    const setReactStatus = vi.fn();
    const fetchDomTree = vi.fn();
    const flow = createElementPickerBridgeFlow({
      getInspectedTabId: () => 7,
      clearPageHoverPreview: vi.fn(),
      isPickerModeActive: () => true,
      setPickerModeActive: vi.fn(),
      setElementOutput,
      setReactStatus,
      setDomTreeStatus: vi.fn(),
      setDomTreeEmpty: vi.fn(),
      fetchDomTree,
      fetchReactInfoForElementSelection: vi.fn(),
      resetRuntimeRefresh: vi.fn(),
      scheduleRuntimeRefresh: vi.fn(),
    });

    flow.onRuntimeMessage({
      action: 'elementPreviewed',
      tabId: 7,
      elementInfo: {
        tagName: 'input',
        selector: '#name',
        domPath: 'html > body > #name',
        clickPoint: { x: 11, y: 22 },
      },
    });

    expect(setElementOutput).toHaveBeenCalledTimes(1);
    expect(setReactStatus).toHaveBeenCalledWith(
      '요소 미리보기 중… 클릭하거나 Enter로 확정하면 컴포넌트 트리를 조회합니다.',
    );
    expect(fetchDomTree).not.toHaveBeenCalled();

    vi.advanceTimersByTime(80);
    expect(fetchDomTree).toHaveBeenCalledWith(
      '#name',
      { x: 11, y: 22 },
      'html > body > #name',
    );
  });

  it('ignores elementPreviewed when picker mode is inactive', () => {
    const setElementOutput = vi.fn();
    const fetchDomTree = vi.fn();
    const flow = createElementPickerBridgeFlow({
      getInspectedTabId: () => 7,
      clearPageHoverPreview: vi.fn(),
      isPickerModeActive: () => false,
      setPickerModeActive: vi.fn(),
      setElementOutput,
      setReactStatus: vi.fn(),
      setDomTreeStatus: vi.fn(),
      setDomTreeEmpty: vi.fn(),
      fetchDomTree,
      fetchReactInfoForElementSelection: vi.fn(),
      resetRuntimeRefresh: vi.fn(),
      scheduleRuntimeRefresh: vi.fn(),
    });

    flow.onRuntimeMessage({
      action: 'elementPreviewed',
      tabId: 7,
      elementInfo: {
        tagName: 'input',
        selector: '#name',
        domPath: 'html > body > #name',
      },
    });

    vi.runAllTimers();
    expect(setElementOutput).not.toHaveBeenCalled();
    expect(fetchDomTree).not.toHaveBeenCalled();
  });

  it('schedules background refresh on pageRuntimeChanged message', () => {
    const scheduleRuntimeRefresh = vi.fn();
    const flow = createElementPickerBridgeFlow({
      getInspectedTabId: () => 11,
      clearPageHoverPreview: vi.fn(),
      isPickerModeActive: () => true,
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
        isPickerModeActive: () => true,
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
