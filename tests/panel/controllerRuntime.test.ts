import { describe, expect, it, vi } from 'vitest';
import type { RuntimeRefreshLookup } from '../../src/features/panel/reactInspector/lookup';
import { createPanelControllerRuntime } from '../../src/features/panel/controller/runtime';
import type { PanelControllerContext } from '../../src/features/panel/controller/context';
import type { RuntimeRefreshScheduler } from '../../src/features/panel/runtimeRefresh/scheduler';
import type { CreatePanelRuntimePickerFlowOptions } from '../../src/features/panel/controller/runtimePickerFlow';

function createContextStub() {
  let removeRuntimeMessageListener: (() => void) | null = null;
  return {
    isPickerModeActive: vi.fn(() => false),
    setPickerModeActive: vi.fn(),
    getOutputEl: vi.fn(),
    getTargetSelectEl: vi.fn(),
    getFetchBtnEl: vi.fn(),
    getSelectElementBtnEl: vi.fn(),
    getPayloadModeBtnEl: vi.fn(),
    getComponentSearchInputEl: vi.fn(),
    getReactPayloadMode: vi.fn(() => 'lite'),
    setReactPayloadMode: vi.fn(),
    getElementOutputEl: vi.fn(),
    getDomTreeStatusEl: vi.fn(),
    getDomTreeOutputEl: vi.fn(),
    getReactStatusEl: vi.fn(),
    getReactComponentListEl: vi.fn(),
    getTreePaneEl: vi.fn(),
    getReactComponentDetailEl: vi.fn(),
    getPanelWorkspaceEl: vi.fn(),
    getPanelContentEl: vi.fn(),
    getWorkspacePanelToggleBarEl: vi.fn(),
    getWorkspaceDockPreviewEl: vi.fn(),
    getWorkspacePanelElements: vi.fn(),
    getWorkspaceLayoutManager: vi.fn(() => null),
    setWorkspaceLayoutManager: vi.fn(),
    getDestroyWheelScrollFallback: vi.fn(() => null),
    setDestroyWheelScrollFallback: vi.fn(),
    getRemoveRuntimeMessageListener: vi.fn(() => removeRuntimeMessageListener),
    setRemoveRuntimeMessageListener: vi.fn((removeListener: (() => void) | null) => {
      removeRuntimeMessageListener = removeListener;
    }),
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

describe('createPanelControllerRuntime', () => {
  it('wires runtime refresh and element picker callbacks', () => {
    const panelControllerContext = createContextStub();
    const runtimeRefreshScheduler = createSchedulerStub();
    const onInspectedPageNavigated = vi.fn();
    let capturedRuntimeRefreshOptions: any = null;
    let capturedPickerFlowOptions: CreatePanelRuntimePickerFlowOptions | null = null;
    const onSelectElement = vi.fn();
    let capturedTeardownOptions: any = null;
    const fetchReactInfoForRuntimeRefresh = vi.fn();
    const fetchReactInfoForElementSelection = vi.fn();
    const removeNavigatedListener = vi.fn();
    const lookup: RuntimeRefreshLookup = { selector: '#root' };

    const bindings = createPanelControllerRuntime(
      {
        panelControllerContext,
        getStoredLookup: () => lookup,
        setStoredLookup: vi.fn(),
        fetchReactInfoForRuntimeRefresh,
        fetchReactInfoForElementSelection,
        clearPageHoverPreview: vi.fn(),
        fetchDomTree: vi.fn(),
        setElementOutput: vi.fn(),
        setReactStatus: vi.fn(),
        setDomTreeStatus: vi.fn(),
        setDomTreeEmpty: vi.fn(),
        getInspectedTabId: () => 1,
        removeNavigatedListener,
      },
      {
        createPanelRuntimeRefreshFlow: vi.fn((runtimeRefreshOptions: any) => {
          capturedRuntimeRefreshOptions = runtimeRefreshOptions;
          return { runtimeRefreshScheduler, onInspectedPageNavigated };
        }),
        createPanelRuntimePickerFlow: vi.fn(
          (pickerFlowOptions: CreatePanelRuntimePickerFlowOptions) => {
            capturedPickerFlowOptions = pickerFlowOptions;
            return { onSelectElement };
          },
        ),
        createPanelTeardownFlow: vi.fn((teardownOptions: any) => {
          capturedTeardownOptions = teardownOptions;
          return vi.fn();
        }),
      },
    );

    expect(bindings.runtimeRefreshScheduler).toBe(runtimeRefreshScheduler);
    expect(bindings.onInspectedPageNavigated).toBe(onInspectedPageNavigated);
    expect(bindings.onSelectElement).toBe(onSelectElement);
    expect(capturedRuntimeRefreshOptions.runRefresh).toBe(fetchReactInfoForRuntimeRefresh);
    expect(capturedPickerFlowOptions?.runtimeRefreshScheduler).toBe(runtimeRefreshScheduler);
    expect(capturedPickerFlowOptions?.fetchReactInfoForElementSelection).toBe(
      fetchReactInfoForElementSelection,
    );

    capturedTeardownOptions.removeNavigatedListener();
    expect(removeNavigatedListener).toHaveBeenCalledWith(onInspectedPageNavigated);
  });
});
