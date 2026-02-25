import type {
  JsonPathSegment,
  JsonSectionKind,
  ReactComponentInfo,
} from '../../../shared/inspector/types';
import type { RuntimeRefreshLookup } from './lookup';
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

type CallInspectedPageAgent = (
  method: string,
  args: unknown,
  onDone: (result: unknown | null, errorText?: string) => void,
) => void;

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
      storedLookup: options.getStoredLookup(),
    });
    options.callInspectedPageAgent('reactInspectPath', args, (response, errorText) => {
      const completion = resolveReactInspectPathRequestCompletionValue(response, errorText);
      requestOptions.onDone(completion);
    });
  };
}
