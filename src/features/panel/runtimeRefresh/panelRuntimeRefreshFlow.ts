import {
  resolveRuntimeRefreshLookup as resolveRuntimeRefreshLookupValue,
  type RuntimeRefreshLookup,
} from '../reactInspector/lookup';
import {
  createRuntimeRefreshScheduler as createRuntimeRefreshSchedulerValue,
  type RuntimeRefreshScheduler,
} from './scheduler';

interface CreatePanelRuntimeRefreshFlowOptions {
  isPickerModeActive: () => boolean;
  getStoredLookup: () => RuntimeRefreshLookup | null;
  setStoredLookup: (lookup: RuntimeRefreshLookup | null) => void;
  runRefresh: (lookup: RuntimeRefreshLookup, background: boolean, onDone: () => void) => void;
  shouldAllowBackgroundRefresh?: () => boolean;
  setElementOutput: (text: string) => void;
  setDomTreeStatus: (text: string) => void;
  setDomTreeEmpty: (text: string) => void;
  minIntervalMs?: number;
  debounceMs?: number;
  appendDebugLog?: (eventName: string, payload?: unknown) => void;
}

interface PanelRuntimeRefreshFlowDependencies {
  resolveRuntimeRefreshLookup: (
    storedLookup: RuntimeRefreshLookup | null,
  ) => RuntimeRefreshLookup;
  createRuntimeRefreshScheduler: typeof createRuntimeRefreshSchedulerValue;
}

const PANEL_RUNTIME_REFRESH_FLOW_DEFAULT_DEPS: PanelRuntimeRefreshFlowDependencies = {
  resolveRuntimeRefreshLookup: resolveRuntimeRefreshLookupValue,
  createRuntimeRefreshScheduler: createRuntimeRefreshSchedulerValue,
};

/** 패널 런타임 갱신 스케줄러와 네비게이션 연계 핸들러를 구성한다. */
export function createPanelRuntimeRefreshFlow(
  options: CreatePanelRuntimeRefreshFlowOptions,
  deps: PanelRuntimeRefreshFlowDependencies = PANEL_RUNTIME_REFRESH_FLOW_DEFAULT_DEPS,
): {
  runtimeRefreshScheduler: RuntimeRefreshScheduler;
  onInspectedPageNavigated: (url: string) => void;
} {
  const runtimeRefreshScheduler = deps.createRuntimeRefreshScheduler({
    minIntervalMs: options.minIntervalMs ?? 1200,
    debounceMs: options.debounceMs ?? 250,
    isPickerModeActive: options.isPickerModeActive,
    getLookup: () => deps.resolveRuntimeRefreshLookup(options.getStoredLookup()),
    runRefresh: (lookup, background, onDone) => {
      // Full payload 직렬화가 진행 중일 때는 background refresh를 건너뛰어
      // 늦게 도착한 자동 갱신 결과가 현재 foreground 트리를 덮어쓰지 않게 한다.
      if (background && options.shouldAllowBackgroundRefresh?.() === false) {
        options.appendDebugLog?.('runtimeRefresh.skip', {
          reason: 'payloadModeFull',
        });
        onDone();
        return;
      }
      options.runRefresh(lookup, background, onDone);
    },
  });

  function onInspectedPageNavigated(url: string) {
    options.appendDebugLog?.('runtimeRefresh.navigated', { url });
    options.setStoredLookup(null);
    runtimeRefreshScheduler.reset();
    options.setElementOutput(`페이지 이동 감지: ${url}`);
    options.setDomTreeStatus('페이지 변경 감지됨. 요소를 선택하면 DOM 트리를 표시합니다.');
    options.setDomTreeEmpty('요소를 선택하면 DOM 트리를 표시합니다.');
    runtimeRefreshScheduler.refresh(false);
  }

  return {
    runtimeRefreshScheduler,
    onInspectedPageNavigated,
  };
}
