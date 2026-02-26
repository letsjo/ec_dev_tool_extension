import type { PickPoint } from '../../../../shared/inspector';
import type { PanelControllerContext } from '../context';
import type { FetchReactInfoOptions, ReactPayloadMode } from '../../reactInspector/fetchOptions';
import type { RuntimeRefreshLookup } from '../../reactInspector/lookup';
import type { RuntimeRefreshScheduler } from '../../runtimeRefresh/scheduler';
import {
  createElementSelectionFetchOptions as createElementSelectionFetchOptionsValue,
  createRuntimeRefreshFetchOptions as createRuntimeRefreshFetchOptionsValue,
} from '../../reactInspector/fetchOptions';

interface CreateLifecycleReactFetchBindingsOptions {
  panelControllerContext: PanelControllerContext;
  fetchReactInfo: (
    selector: string,
    pickPoint?: PickPoint,
    fetchOptions?: FetchReactInfoOptions,
  ) => void;
  createRuntimeRefreshFetchOptions?: typeof createRuntimeRefreshFetchOptionsValue;
  createElementSelectionFetchOptions?: typeof createElementSelectionFetchOptionsValue;
}

interface CreatePayloadModeToggleHandlerOptions {
  panelControllerContext: PanelControllerContext;
  runtimeRefreshScheduler: RuntimeRefreshScheduler;
  appendDebugLog?: (eventName: string, payload?: unknown) => void;
}

function resolveNextPayloadMode(currentMode: ReactPayloadMode): ReactPayloadMode {
  return currentMode === 'lite' ? 'full' : 'lite';
}

/**
 * runtime refresh/element selection 경로에서 공통 payload mode를 적용해
 * reactInspect fetch 옵션 프리셋을 조립하는 바인딩을 만든다.
 */
export function createLifecycleReactFetchBindings({
  panelControllerContext,
  fetchReactInfo,
  createRuntimeRefreshFetchOptions = createRuntimeRefreshFetchOptionsValue,
  createElementSelectionFetchOptions = createElementSelectionFetchOptionsValue,
}: CreateLifecycleReactFetchBindingsOptions) {
  return {
    fetchReactInfoForRuntimeRefresh: (
      lookup: RuntimeRefreshLookup,
      background: boolean,
      onDone: () => void,
    ) => {
      fetchReactInfo(
        lookup.selector,
        lookup.pickPoint,
        createRuntimeRefreshFetchOptions(
          background,
          panelControllerContext.getReactPayloadMode(),
          onDone,
        ),
      );
    },
    fetchReactInfoForElementSelection: (selector: string, pickPoint?: PickPoint) => {
      fetchReactInfo(
        selector,
        pickPoint,
        createElementSelectionFetchOptions(panelControllerContext.getReactPayloadMode()),
      );
    },
  };
}

/** payload mode 토글 후 즉시 refresh를 호출해 현재 뷰를 최신 모드로 동기화한다. */
export function createPayloadModeToggleHandler({
  panelControllerContext,
  runtimeRefreshScheduler,
  appendDebugLog,
}: CreatePayloadModeToggleHandlerOptions) {
  return () => {
    const nextMode = resolveNextPayloadMode(panelControllerContext.getReactPayloadMode());
    panelControllerContext.setReactPayloadMode(nextMode);
    appendDebugLog?.('reactInspect.payloadMode.toggle', { mode: nextMode });
    runtimeRefreshScheduler.refresh(false);
  };
}

export type {
  CreateLifecycleReactFetchBindingsOptions,
  CreatePayloadModeToggleHandlerOptions,
};
