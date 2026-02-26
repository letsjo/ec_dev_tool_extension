import {
  buildOpenFunctionInSourcesExpression as buildOpenFunctionInSourcesExpressionValue,
  buildOpenFunctionInSourcesFailureStatusText as buildOpenFunctionInSourcesFailureStatusTextValue,
  buildOpenFunctionInSourcesSuccessStatusText as buildOpenFunctionInSourcesSuccessStatusTextValue,
  resolveOpenFunctionInSourcesFailureReason as resolveOpenFunctionInSourcesFailureReasonValue,
} from '../openInSources';

const DEFAULT_PAGE_FUNCTION_INSPECT_REGISTRY_KEY = '__EC_DEV_TOOL_FUNCTION_INSPECT_REGISTRY__';

interface CreateFunctionSourceOpenerOptions {
  setReactStatus: (text: string, isError?: boolean) => void;
  storeKey?: string;
}

/**
 * 함수 inspect 오프너를 생성한다.
 * controller는 상태 setter만 주입하고, expression 조립/실행/실패 판정 규칙은 이 모듈에서 처리한다.
 */
export function createFunctionSourceOpener(options: CreateFunctionSourceOpenerOptions) {
  const storeKey = options.storeKey ?? DEFAULT_PAGE_FUNCTION_INSPECT_REGISTRY_KEY;

  return function openFunctionInSources(inspectRefKey: string, functionName: string) {
    const expression = buildOpenFunctionInSourcesExpressionValue({
      inspectRefKey,
      storeKey,
    });

    chrome.devtools.inspectedWindow.eval(expression, (result, exceptionInfo) => {
      const failureReason = resolveOpenFunctionInSourcesFailureReasonValue({
        result,
        exceptionInfo,
        runtimeErrorMessage: chrome.runtime.lastError
          ? (chrome.runtime.lastError.message ?? '실행 오류')
          : null,
      });
      if (failureReason) {
        options.setReactStatus(
          buildOpenFunctionInSourcesFailureStatusTextValue(failureReason),
          true,
        );
        return;
      }
      options.setReactStatus(
        buildOpenFunctionInSourcesSuccessStatusTextValue(functionName),
      );
    });
  };
}
