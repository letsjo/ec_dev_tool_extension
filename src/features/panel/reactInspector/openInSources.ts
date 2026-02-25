import { isRecord } from '../../../shared/inspector/guards';

interface BuildOpenFunctionInSourcesExpressionParams {
  inspectRefKey: string;
  storeKey: string;
}

interface ResolveOpenFunctionInSourcesFailureParams {
  result: unknown;
  exceptionInfo: unknown;
  runtimeErrorMessage?: string | null;
}

/**
 * inspectedWindow.eval로 실행할 inspect 래퍼 스크립트를 생성한다.
 * store key/ref key는 JSON literal로 주입해 quoting 이슈를 방지한다.
 */
export function buildOpenFunctionInSourcesExpression(
  params: BuildOpenFunctionInSourcesExpressionParams,
): string {
  const storeKeyLiteral = JSON.stringify(params.storeKey);
  const refKeyLiteral = JSON.stringify(params.inspectRefKey);
  return `(function(){try{const store=window[${storeKeyLiteral}];const fn=store&&store[${refKeyLiteral}];if(typeof fn!=="function"){return {ok:false,error:"inspect 대상 함수를 찾지 못했습니다."};}if(typeof inspect!=="function"){return {ok:false,error:"DevTools inspect 함수를 사용할 수 없습니다."};}inspect(fn);return {ok:true};}catch(error){return {ok:false,error:String(error&&error.message?error.message:error)};}})();`;
}

/**
 * DevTools inspect 호출 결과에서 실패 원인을 한 곳에서 판정한다.
 * runtime error -> exceptionInfo -> page eval 응답 순서로 우선순위를 적용한다.
 */
export function resolveOpenFunctionInSourcesFailureReason(
  params: ResolveOpenFunctionInSourcesFailureParams,
): string | null {
  if (typeof params.runtimeErrorMessage === 'string' && params.runtimeErrorMessage.length > 0) {
    return params.runtimeErrorMessage;
  }
  if (isRecord(params.exceptionInfo) && params.exceptionInfo.isException === true) {
    return typeof params.exceptionInfo.description === 'string'
      ? params.exceptionInfo.description
      : '예외가 발생했습니다.';
  }
  if (!isRecord(params.result) || params.result.ok !== true) {
    return isRecord(params.result) ? String(params.result.error ?? '알 수 없는 오류') : '알 수 없는 오류';
  }
  return null;
}

/** 함수 inspect 이동 실패 상태 문구를 생성한다. */
export function buildOpenFunctionInSourcesFailureStatusText(reason: string): string {
  return `함수 이동 실패: ${reason}`;
}

/** 함수 inspect 이동 성공 상태 문구를 생성한다. */
export function buildOpenFunctionInSourcesSuccessStatusText(functionName: string): string {
  return `함수 ${functionName} 위치로 이동했습니다.`;
}
