import type { PickPoint } from '../../../shared/inspector';
import { createElementPickerBridgeFlow as createElementPickerBridgeFlowValue } from '../elementPicker/bridgeFlow';
import { bindRuntimeMessageListener as bindRuntimeMessageListenerValue } from '../lifecycle/runtimeMessageBinding';
import type { PanelControllerContext } from './context';
import type { RuntimeRefreshScheduler } from '../runtimeRefresh/scheduler';

interface CreatePanelRuntimePickerFlowOptions {
  panelControllerContext: PanelControllerContext;
  runtimeRefreshScheduler: RuntimeRefreshScheduler;
  getInspectedTabId: () => number;
  clearPageHoverPreview: () => void;
  fetchReactInfoForElementSelection: (selector: string, pickPoint?: PickPoint) => void;
  fetchDomTree: (selector: string, pickPoint?: PickPoint, domPath?: string) => void;
  setElementOutput: (text: string) => void;
  setReactStatus: (text: string, isError?: boolean) => void;
  setDomTreeStatus: (text: string, isError?: boolean) => void;
  setDomTreeEmpty: (text: string) => void;
  appendDebugLog?: (eventName: string, payload?: unknown) => void;
}

interface PanelRuntimePickerFlowDependencies {
  createElementPickerBridgeFlow: typeof createElementPickerBridgeFlowValue;
  bindRuntimeMessageListener: typeof bindRuntimeMessageListenerValue;
}

const PANEL_RUNTIME_PICKER_FLOW_DEFAULT_DEPS: PanelRuntimePickerFlowDependencies = {
  createElementPickerBridgeFlow: createElementPickerBridgeFlowValue,
  bindRuntimeMessageListener: bindRuntimeMessageListenerValue,
};

function consumeKeyboardShortcutEvent(event: KeyboardEvent) {
  event.preventDefault();
  event.stopPropagation();
  const eventWithImmediateStop = event as KeyboardEvent & { stopImmediatePropagation?: () => void };
  eventWithImmediateStop.stopImmediatePropagation?.();
}

/**
 * picker bridge/runtime-message 결선을 구성하고 제거 핸들을 context에 저장한다.
 * runtime controller는 refresh/teardown 조립에 집중하고 picker 이벤트 결선은 분리한다.
 */
export function createPanelRuntimePickerFlow(
  options: CreatePanelRuntimePickerFlowOptions,
  deps: PanelRuntimePickerFlowDependencies = PANEL_RUNTIME_PICKER_FLOW_DEFAULT_DEPS,
): {
  onSelectElement: () => void;
  onPickerShortcutKeyDown: (event: KeyboardEvent) => void;
} {
  const { onSelectElement, onConfirmElementByShortcut, onCancelElementByShortcut, onRuntimeMessage } =
    deps.createElementPickerBridgeFlow({
    getInspectedTabId: options.getInspectedTabId,
    clearPageHoverPreview: options.clearPageHoverPreview,
    isPickerModeActive: options.panelControllerContext.isPickerModeActive,
    setPickerModeActive: options.panelControllerContext.setPickerModeActive,
    setElementOutput: options.setElementOutput,
    setReactStatus: options.setReactStatus,
    setDomTreeStatus: options.setDomTreeStatus,
    setDomTreeEmpty: options.setDomTreeEmpty,
    fetchDomTree: options.fetchDomTree,
    fetchReactInfoForElementSelection: options.fetchReactInfoForElementSelection,
    scheduleRuntimeRefresh: () => {
      // pageRuntimeChanged는 background refresh 경로로 스케줄링해 foreground 선택 흐름과 충돌을 줄인다.
      options.appendDebugLog?.('runtimeRefresh.schedule', { background: true });
      options.runtimeRefreshScheduler.schedule(true);
    },
    resetRuntimeRefresh: () => {
      // elementSelected 직후에는 pending refresh를 비워 stale 응답 역전 가능성을 줄인다.
      options.appendDebugLog?.('runtimeRefresh.reset');
      options.runtimeRefreshScheduler.reset();
    },
    appendDebugLog: options.appendDebugLog,
  });

  options.panelControllerContext.setRemoveRuntimeMessageListener(
    // listener remove handle을 context에 보관해 teardown flow에서 일관되게 해제한다.
    deps.bindRuntimeMessageListener(onRuntimeMessage, {
      addListener(listener) {
        chrome.runtime.onMessage.addListener(listener);
      },
      removeListener(listener) {
        chrome.runtime.onMessage.removeListener(listener);
      },
    }),
  );

  function onPickerShortcutKeyDown(event: KeyboardEvent) {
    if (!options.panelControllerContext.isPickerModeActive()) return;
    if (event.key === 'Enter') {
      consumeKeyboardShortcutEvent(event);
      onConfirmElementByShortcut();
      return;
    }
    if (event.key === 'Escape') {
      consumeKeyboardShortcutEvent(event);
      onCancelElementByShortcut();
    }
  }

  return { onSelectElement, onPickerShortcutKeyDown };
}

export type { CreatePanelRuntimePickerFlowOptions, PanelRuntimePickerFlowDependencies };
