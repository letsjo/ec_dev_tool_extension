import {
  buildReactInspectApplyOptions,
  type FetchReactInfoOptions,
} from './fetchOptions';
import {
  handleReactInspectAgentResponse,
  type ReactInspectApplyOptions,
} from '../pageAgent/responsePipeline';
import type { ReactInspectResult } from '../../../shared/inspector/types';

interface ApplyReactFetchResponseStageOptions {
  response: unknown | null;
  errorText: string | undefined;
  fetchOptions: FetchReactInfoOptions;
  resetReactInspector: (statusText: string, isError?: boolean) => void;
  applyReactInspectResult: (result: ReactInspectResult, options: ReactInspectApplyOptions) => void;
  finish: () => void;
}

/** reactInspect 응답을 파이프라인으로 전달하고 완료 후 후속 콜백을 실행한다. */
function applyReactFetchResponseStage(options: ApplyReactFetchResponseStageOptions) {
  handleReactInspectAgentResponse({
    response: options.response,
    errorText: options.errorText,
    applyOptions: buildReactInspectApplyOptions(options.fetchOptions),
    resetReactInspector: options.resetReactInspector,
    applyReactInspectResult: options.applyReactInspectResult,
  });
  options.finish();
}

export { applyReactFetchResponseStage };
