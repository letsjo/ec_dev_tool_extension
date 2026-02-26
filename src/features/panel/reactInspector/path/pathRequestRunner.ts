import type {
  JsonPathSegment,
  JsonSectionKind,
  ReactComponentInfo,
} from '../../../../shared/inspector';
import type { CallInspectedPageAgent } from '../../bridge/pageAgentClient';
import type { RuntimeRefreshLookup } from '../lookup';
import {
  buildReactInspectPathRequestArgs as buildReactInspectPathRequestArgsValue,
  type ReactInspectPathMode,
} from './pathRequest';
import {
  resolveReactInspectPathRequestCompletion as resolveReactInspectPathRequestCompletionValue,
  type ReactInspectPathRequestCompletion,
} from './pathRequestCompletion';

export interface RequestReactInspectPathOptions {
  component: ReactComponentInfo;
  section: JsonSectionKind;
  path: JsonPathSegment[];
  mode: ReactInspectPathMode;
  serializeLimit?: number;
  onDone: (completion: ReactInspectPathRequestCompletion) => void;
}

interface CreateReactInspectPathRequesterOptions {
  callInspectedPageAgent: CallInspectedPageAgent;
  getStoredLookup: () => RuntimeRefreshLookup | null;
}

/**
 * reactInspectPath 요청 러너를 생성한다.
 * controller는 lookup 저장소/브리지 구현을 주입하고, 호출부는 옵션만 전달해 요청을 실행한다.
 */
export function createReactInspectPathRequester(options: CreateReactInspectPathRequesterOptions) {
  return function requestReactInspectPath(requestOptions: RequestReactInspectPathOptions) {
    const args = buildReactInspectPathRequestArgsValue({
      component: requestOptions.component,
      section: requestOptions.section,
      path: requestOptions.path,
      mode: requestOptions.mode,
      serializeLimit: requestOptions.serializeLimit,
      // 요소 선택 후 selector가 바뀌는 경우를 대비해 최근 lookup(selector/pickPoint)을 같이 전달한다.
      storedLookup: options.getStoredLookup(),
    });
    options.callInspectedPageAgent('reactInspectPath', args, (response, errorText) => {
      // 브리지/runtime 오류와 응답 형식 오류를 completion 유니온으로 정규화해 호출부 분기를 단순화한다.
      const completion = resolveReactInspectPathRequestCompletionValue(response, errorText);
      requestOptions.onDone(completion);
    });
  };
}
