import type { PickPoint } from '../../../shared/inspector';
import { createElementPickerBridgeFlow as createElementPickerBridgeFlowValue } from '../elementPicker/bridgeFlow';
import { bindRuntimeMessageListener as bindRuntimeMessageListenerValue } from '../lifecycle/runtimeMessageBinding';
import { createPanelTeardownFlow as createPanelTeardownFlowValue } from '../lifecycle/panelTeardownFlow';
import type { PanelControllerContext } from './context';
import type { RuntimeRefreshLookup } from '../reactInspector/lookup';
import { createPanelRuntimeRefreshFlow as createPanelRuntimeRefreshFlowValue } from '../runtimeRefresh/panelRuntimeRefreshFlow';
import type { RuntimeRefreshScheduler } from '../runtimeRefresh/scheduler';

interface CreatePanelControllerRuntimeOptions {
  panelControllerContext: PanelControllerContext;
  getStoredLookup: () => RuntimeRefreshLookup | null;
  setStoredLookup: (lookup: RuntimeRefreshLookup | null) => void;
  fetchReactInfoForRuntimeRefresh: (
    lookup: RuntimeRefreshLookup,
    background: boolean,
    onDone: () => void,
  ) => void;
  fetchReactInfoForElementSelection: (selector: string, pickPoint?: PickPoint) => void;
  clearPageHoverPreview: () => void;
  fetchDomTree: (selector: string, pickPoint?: PickPoint) => void;
  setElementOutput: (text: string) => void;
  setReactStatus: (text: string, isError?: boolean) => void;
  setDomTreeStatus: (text: string, isError?: boolean) => void;
  setDomTreeEmpty: (text: string) => void;
  getInspectedTabId: () => number;
  removeNavigatedListener: (listener: (url: string) => void) => void;
}

interface PanelControllerRuntimeDependencies {
  createPanelRuntimeRefreshFlow: typeof createPanelRuntimeRefreshFlowValue;
  createElementPickerBridgeFlow: typeof createElementPickerBridgeFlowValue;
  bindRuntimeMessageListener: typeof bindRuntimeMessageListenerValue;
  createPanelTeardownFlow: typeof createPanelTeardownFlowValue;
}

export interface PanelControllerRuntimeBindings {
  runtimeRefreshScheduler: RuntimeRefreshScheduler;
  onInspectedPageNavigated: (url: string) => void;
  onSelectElement: () => void;
  onPanelBeforeUnload: () => void;
}

const PANEL_CONTROLLER_RUNTIME_DEFAULT_DEPS: PanelControllerRuntimeDependencies = {
  createPanelRuntimeRefreshFlow: createPanelRuntimeRefreshFlowValue,
  createElementPickerBridgeFlow: createElementPickerBridgeFlowValue,
  bindRuntimeMessageListener: bindRuntimeMessageListenerValue,
  createPanelTeardownFlow: createPanelTeardownFlowValue,
};

/**
 * controller의 runtime refresh + element picker + teardown 결선을 묶는다.
 * controller.ts는 DOM/flow 생성과 bootstrap 호출 오케스트레이션에 집중한다.
 */
export function createPanelControllerRuntime(
  options: CreatePanelControllerRuntimeOptions,
  deps: PanelControllerRuntimeDependencies = PANEL_CONTROLLER_RUNTIME_DEFAULT_DEPS,
): PanelControllerRuntimeBindings {
  const { runtimeRefreshScheduler, onInspectedPageNavigated } =
    deps.createPanelRuntimeRefreshFlow({
      isPickerModeActive: options.panelControllerContext.isPickerModeActive,
      getStoredLookup: options.getStoredLookup,
      setStoredLookup: options.setStoredLookup,
      runRefresh: options.fetchReactInfoForRuntimeRefresh,
      setElementOutput: options.setElementOutput,
      setDomTreeStatus: options.setDomTreeStatus,
      setDomTreeEmpty: options.setDomTreeEmpty,
    });

  const { onSelectElement, onRuntimeMessage } = deps.createElementPickerBridgeFlow({
    getInspectedTabId: options.getInspectedTabId,
    clearPageHoverPreview: options.clearPageHoverPreview,
    setPickerModeActive: options.panelControllerContext.setPickerModeActive,
    setElementOutput: options.setElementOutput,
    setReactStatus: options.setReactStatus,
    setDomTreeStatus: options.setDomTreeStatus,
    setDomTreeEmpty: options.setDomTreeEmpty,
    fetchDomTree: options.fetchDomTree,
    fetchReactInfoForElementSelection: options.fetchReactInfoForElementSelection,
    scheduleRuntimeRefresh: () => {
      runtimeRefreshScheduler.schedule(true);
    },
  });

  options.panelControllerContext.setRemoveRuntimeMessageListener(
    deps.bindRuntimeMessageListener(onRuntimeMessage, {
      addListener(listener) {
        chrome.runtime.onMessage.addListener(listener);
      },
      removeListener(listener) {
        chrome.runtime.onMessage.removeListener(listener);
      },
    }),
  );

  const onPanelBeforeUnload = deps.createPanelTeardownFlow({
    getWorkspaceLayoutManager: options.panelControllerContext.getWorkspaceLayoutManager,
    setWorkspaceLayoutManager: options.panelControllerContext.setWorkspaceLayoutManager,
    getDestroyWheelScrollFallback: options.panelControllerContext.getDestroyWheelScrollFallback,
    setDestroyWheelScrollFallback: options.panelControllerContext.setDestroyWheelScrollFallback,
    getRemoveRuntimeMessageListener: options.panelControllerContext.getRemoveRuntimeMessageListener,
    setRemoveRuntimeMessageListener: options.panelControllerContext.setRemoveRuntimeMessageListener,
    runtimeRefreshScheduler,
    removeNavigatedListener: () => {
      options.removeNavigatedListener(onInspectedPageNavigated);
    },
  });

  return {
    runtimeRefreshScheduler,
    onInspectedPageNavigated,
    onSelectElement,
    onPanelBeforeUnload,
  };
}
