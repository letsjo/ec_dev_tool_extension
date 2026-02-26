import type { PickPoint } from '../../../shared/inspector';
import { createPanelTeardownFlow as createPanelTeardownFlowValue } from '../lifecycle/panelTeardownFlow';
import type { PanelControllerContext } from './context';
import type { RuntimeRefreshLookup } from '../reactInspector/lookup';
import { createPanelRuntimeRefreshFlow as createPanelRuntimeRefreshFlowValue } from '../runtimeRefresh/panelRuntimeRefreshFlow';
import type { RuntimeRefreshScheduler } from '../runtimeRefresh/scheduler';
import { createPanelRuntimePickerFlow as createPanelRuntimePickerFlowValue } from './runtimePickerFlow';

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
  fetchDomTree: (selector: string, pickPoint?: PickPoint, domPath?: string) => void;
  setElementOutput: (text: string) => void;
  setReactStatus: (text: string, isError?: boolean) => void;
  setDomTreeStatus: (text: string, isError?: boolean) => void;
  setDomTreeEmpty: (text: string) => void;
  getInspectedTabId: () => number;
  removeNavigatedListener: (listener: (url: string) => void) => void;
  appendDebugLog?: (eventName: string, payload?: unknown) => void;
}

interface PanelControllerRuntimeDependencies {
  createPanelRuntimeRefreshFlow: typeof createPanelRuntimeRefreshFlowValue;
  createPanelRuntimePickerFlow: typeof createPanelRuntimePickerFlowValue;
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
  createPanelRuntimePickerFlow: createPanelRuntimePickerFlowValue,
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
      appendDebugLog: options.appendDebugLog,
    });

  const { onSelectElement } = deps.createPanelRuntimePickerFlow({
    panelControllerContext: options.panelControllerContext,
    runtimeRefreshScheduler,
    getInspectedTabId: options.getInspectedTabId,
    clearPageHoverPreview: options.clearPageHoverPreview,
    fetchReactInfoForElementSelection: options.fetchReactInfoForElementSelection,
    fetchDomTree: options.fetchDomTree,
    setElementOutput: options.setElementOutput,
    setReactStatus: options.setReactStatus,
    setDomTreeStatus: options.setDomTreeStatus,
    setDomTreeEmpty: options.setDomTreeEmpty,
    appendDebugLog: options.appendDebugLog,
  });

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
