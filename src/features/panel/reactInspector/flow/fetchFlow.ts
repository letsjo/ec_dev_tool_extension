import type {
  PickPoint,
  ReactComponentInfo,
  ReactInspectResult,
} from '../../../../shared/inspector';
import type { CallInspectedPageAgent } from '../../bridge/pageAgentClient';
import type { ReactInspectApplyOptions } from '../../pageAgent/responsePipeline';
import type { FetchReactInfoOptions } from '../fetchOptions';
import type { RuntimeRefreshLookup } from '../lookup';
import { applyReactFetchRequestStage } from './fetchRequestStage';
import { applyReactFetchResponseStage } from './fetchResponseStage';

interface CreateReactInspectFetchFlowOptions {
  callInspectedPageAgent: CallInspectedPageAgent;
  getStoredLookup: () => RuntimeRefreshLookup | null;
  setStoredLookup: (lookup: RuntimeRefreshLookup | null) => void;
  getReactComponents: () => ReactComponentInfo[];
  getSelectedReactComponentIndex: () => number;
  clearPageHoverPreview: () => void;
  clearPageComponentHighlight: () => void;
  applyLoadingPaneState: () => void;
  resetReactInspector: (statusText: string, isError?: boolean) => void;
  applyReactInspectResult: (
    result: ReactInspectResult,
    options: ReactInspectApplyOptions,
  ) => void;
}

/**
 * reactInspect 조회 request/response stage를 조립한다.
 * controller는 상태 getter/setter와 UI side effect를 주입하고 fetch 호출만 사용한다.
 */
export function createReactInspectFetchFlow(options: CreateReactInspectFetchFlowOptions) {
  let latestRequestId = 0;

  function fetchReactInfo(
    selector: string,
    pickPoint?: PickPoint,
    fetchOptions: FetchReactInfoOptions = {},
  ) {
    const requestId = latestRequestId + 1;
    latestRequestId = requestId;

    const finish = () => {
      fetchOptions.onDone?.();
    };

    const requestStage = applyReactFetchRequestStage({
      selector,
      pickPoint,
      fetchOptions,
      getStoredLookup: options.getStoredLookup,
      setStoredLookup: options.setStoredLookup,
      getReactComponents: options.getReactComponents,
      getSelectedReactComponentIndex: options.getSelectedReactComponentIndex,
      clearPageHoverPreview: options.clearPageHoverPreview,
      clearPageComponentHighlight: options.clearPageComponentHighlight,
      applyLoadingPaneState: options.applyLoadingPaneState,
    });

    options.callInspectedPageAgent(
      'reactInspect',
      {
        selector,
        pickPoint: pickPoint ?? null,
        includeSerializedData: !requestStage.lightweight,
        selectedComponentId: requestStage.selectedComponentIdForScript,
      },
      (response, errorText) => {
        // 여러 reactInspect 요청이 동시에 진행될 때 최신 요청만 UI 상태를 갱신한다.
        if (requestId !== latestRequestId) {
          finish();
          return;
        }
        applyReactFetchResponseStage({
          response,
          errorText: errorText ?? undefined,
          fetchOptions,
          resetReactInspector: options.resetReactInspector,
          applyReactInspectResult: options.applyReactInspectResult,
          finish,
        });
      },
    );
  }

  return {
    fetchReactInfo,
  };
}
