import type {
  PickPoint,
  ReactComponentInfo,
  ReactInspectResult,
} from '../../../shared/inspector/types';
import type { CallInspectedPageAgent } from '../bridge/pageAgentClient';
import {
  handleReactInspectAgentResponse,
  type ReactInspectApplyOptions,
} from '../pageAgent/responsePipeline';
import {
  buildReactInspectApplyOptions as buildReactInspectApplyOptionsValue,
  resolveSelectedComponentIdForScript as resolveSelectedComponentIdForScriptValue,
  type FetchReactInfoOptions,
} from './fetchOptions';
import {
  resolveStoredLookup as resolveStoredLookupValue,
  type RuntimeRefreshLookup,
} from './lookup';

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

interface ReactFetchRequestStageResult {
  lightweight: boolean;
  selectedComponentIdForScript: string | null;
}

/**
 * reactInspect 조회 request/response stage를 조립한다.
 * controller는 상태 getter/setter와 UI side effect를 주입하고 fetch 호출만 사용한다.
 */
export function createReactInspectFetchFlow(options: CreateReactInspectFetchFlowOptions) {
  function applyReactFetchRequestStage(
    selector: string,
    pickPoint: PickPoint | undefined,
    fetchOptions: FetchReactInfoOptions,
  ): ReactFetchRequestStageResult {
    const background = fetchOptions.background === true;
    const lightweight = fetchOptions.lightweight === true;

    options.clearPageHoverPreview();
    if (!background) {
      options.clearPageComponentHighlight();
    }
    options.setStoredLookup(
      resolveStoredLookupValue(
        options.getStoredLookup(),
        { selector, pickPoint },
        fetchOptions.keepLookup === true,
      ),
    );

    // background 새로고침이 아니거나 초기 상태일 때만 로딩 문구를 적극적으로 표시한다.
    if (!background || options.getReactComponents().length === 0) {
      options.applyLoadingPaneState();
    }

    const selectedComponentIdForScript = resolveSelectedComponentIdForScriptValue({
      options: fetchOptions,
      selectedReactComponentIndex: options.getSelectedReactComponentIndex(),
      reactComponents: options.getReactComponents(),
    });

    return {
      lightweight,
      selectedComponentIdForScript,
    };
  }

  function applyReactFetchResponseStage(
    response: unknown | null,
    errorText: string | undefined,
    fetchOptions: FetchReactInfoOptions,
    finish: () => void,
  ) {
    handleReactInspectAgentResponse({
      response,
      errorText,
      applyOptions: buildReactInspectApplyOptionsValue(fetchOptions),
      resetReactInspector: options.resetReactInspector,
      applyReactInspectResult: options.applyReactInspectResult,
    });
    finish();
  }

  function fetchReactInfo(
    selector: string,
    pickPoint?: PickPoint,
    fetchOptions: FetchReactInfoOptions = {},
  ) {
    const finish = () => {
      fetchOptions.onDone?.();
    };
    const requestStage = applyReactFetchRequestStage(selector, pickPoint, fetchOptions);

    options.callInspectedPageAgent(
      'reactInspect',
      {
        selector,
        pickPoint: pickPoint ?? null,
        includeSerializedData: !requestStage.lightweight,
        selectedComponentId: requestStage.selectedComponentIdForScript,
      },
      (response, errorText) => {
        applyReactFetchResponseStage(response, errorText ?? undefined, fetchOptions, finish);
      },
    );
  }

  return {
    fetchReactInfo,
  };
}
