import type {
  JsonPathSegment,
  JsonSectionKind,
  ReactComponentInfo,
} from '../../../shared/inspector';
import {
  resolveInspectFunctionPathCompletion as resolveInspectFunctionPathCompletionValue,
  resolveSerializedPathValueFromCompletion as resolveSerializedPathValueFromCompletionValue,
} from './pathCompletion';
import type { RequestReactInspectPathOptions } from './pathRequestRunner';

type RequestReactInspectPath = (options: RequestReactInspectPathOptions) => void;

interface CreateReactInspectPathActionsOptions {
  requestReactInspectPath: RequestReactInspectPath;
  setReactStatus: (text: string, isError?: boolean) => void;
  openFunctionInSources: (inspectRefKey: string, functionName: string) => void;
}

/**
 * reactInspectPath 기반 액션 핸들러를 생성한다.
 * controller는 브리지/상태 setter만 주입하고, 액션 분기 규칙은 이 모듈에서 처리한다.
 */
export function createReactInspectPathActions(options: CreateReactInspectPathActionsOptions) {
  function inspectFunctionAtPath(
    component: ReactComponentInfo,
    section: JsonSectionKind,
    path: JsonPathSegment[],
  ) {
    options.setReactStatus('함수 이동 시도 중…');
    options.requestReactInspectPath({
      component,
      section,
      path,
      mode: 'inspectFunction',
      onDone: (completion) => {
        const result = resolveInspectFunctionPathCompletionValue(completion);
        if (!result.payload) {
          options.setReactStatus(result.statusText ?? '함수 이동 실패: 알 수 없는 오류', true);
          return;
        }
        options.openFunctionInSources(result.payload.inspectRefKey, result.payload.functionName);
      },
    });
  }

  function fetchSerializedValueAtPath(
    component: ReactComponentInfo,
    section: JsonSectionKind,
    path: JsonPathSegment[],
    onDone: (value: unknown | null) => void,
  ) {
    options.requestReactInspectPath({
      component,
      section,
      path,
      mode: 'serializeValue',
      serializeLimit: 45000,
      onDone: (completion) => {
        onDone(resolveSerializedPathValueFromCompletionValue(completion));
      },
    });
  }

  return {
    inspectFunctionAtPath,
    fetchSerializedValueAtPath,
  };
}
