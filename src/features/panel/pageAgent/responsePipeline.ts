import {
  isDomTreeEvalResult,
  isReactInspectResult,
  isRecord,
} from '../../../shared/inspector/guards';
import type {
  DomTreeEvalResult,
  ReactInspectResult,
} from '../../../shared/inspector/types';

export interface ReactInspectApplyOptions {
  preserveSelection?: boolean;
  preserveCollapsed?: boolean;
  highlightSelection?: boolean;
  scrollSelectionIntoView?: boolean;
  expandSelectionAncestors?: boolean;
  lightweight?: boolean;
  trackUpdates?: boolean;
  refreshDetail?: boolean;
  statusText?: string;
}

interface HandleDomTreeAgentResponseOptions {
  response: unknown;
  errorText?: string;
  setDomTreeStatus: (text: string, isError?: boolean) => void;
  setDomTreeEmpty: (text: string) => void;
  applyDomTreeResult: (result: DomTreeEvalResult) => void;
}

/**
 * pageAgent getDomTree 응답을 검증하고 상태 반영 함수를 호출한다.
 * 실패 시 상태 문구/empty 메시지를 일관된 규칙으로 맞춘다.
 */
export function handleDomTreeAgentResponse(options: HandleDomTreeAgentResponseOptions) {
  const {
    response,
    errorText,
    setDomTreeStatus,
    setDomTreeEmpty,
    applyDomTreeResult,
  } = options;

  if (errorText) {
    setDomTreeStatus(`DOM 트리 실행 오류: ${errorText}`, true);
    setDomTreeEmpty('DOM 트리를 가져오지 못했습니다.');
    return;
  }

  if (!isDomTreeEvalResult(response) || !response.ok) {
    const reason = isDomTreeEvalResult(response) ? response.error : '응답 형식 오류';
    setDomTreeStatus(`DOM 트리 조회 실패: ${reason ?? '알 수 없는 오류'}`, true);
    setDomTreeEmpty('DOM 트리를 가져오지 못했습니다.');
    return;
  }

  applyDomTreeResult(response);
}

interface HandleReactInspectAgentResponseOptions {
  response: unknown;
  errorText?: string;
  applyOptions: ReactInspectApplyOptions;
  resetReactInspector: (statusText: string, isError?: boolean) => void;
  applyReactInspectResult: (result: ReactInspectResult, options: ReactInspectApplyOptions) => void;
}

/**
 * pageAgent reactInspect 응답을 검증하고 React inspector 상태 파이프라인으로 전달한다.
 * 실패 케이스는 공통 오류 문구 규칙으로 reset 처리한다.
 */
export function handleReactInspectAgentResponse(options: HandleReactInspectAgentResponseOptions) {
  const {
    response,
    errorText,
    applyOptions,
    resetReactInspector,
    applyReactInspectResult,
  } = options;

  if (errorText) {
    resetReactInspector(`실행 오류: ${errorText}`, true);
    return;
  }

  if (isRecord(response) && 'error' in response) {
    resetReactInspector(`오류: ${String(response.error ?? '알 수 없는 오류')}`, true);
    return;
  }

  if (!isReactInspectResult(response)) {
    resetReactInspector('React 분석 결과 형식이 올바르지 않습니다.', true);
    return;
  }

  applyReactInspectResult(response, applyOptions);
}
