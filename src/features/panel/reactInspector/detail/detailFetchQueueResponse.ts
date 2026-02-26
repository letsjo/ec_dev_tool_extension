import { isReactInspectResult } from '../../../../shared/inspector/guards';
import type { ReactComponentDetailResult } from '../../../../shared/inspector/types';
import {
  DETAIL_FETCH_STALE_SELECTION_MESSAGE,
} from './detailFetchQueueMessages';

interface ResolveDetailFetchPayloadOptions {
  response: unknown | null;
  errorText?: string;
  componentId: string;
}

type DetailFetchPayloadResolution =
  | {
      ok: false;
      reason: string;
      shouldPrefixError: boolean;
    }
  | {
      ok: true;
      detail: ReactComponentDetailResult;
    };

/** reactInspect 상세 응답을 detail queue 적용 가능한 payload로 정규화한다. */
function resolveDetailFetchPayload(
  options: ResolveDetailFetchPayloadOptions,
): DetailFetchPayloadResolution {
  if (options.errorText) {
    return {
      ok: false,
      reason: options.errorText,
      shouldPrefixError: true,
    };
  }

  if (!isReactInspectResult(options.response)) {
    return {
      ok: false,
      reason: '응답 형식 오류',
      shouldPrefixError: true,
    };
  }

  const detailedComponent = options.response.components.find(
    (candidate) => candidate.id === options.componentId,
  );

  if (!detailedComponent || detailedComponent.hasSerializedData === false) {
    return {
      ok: false,
      reason: DETAIL_FETCH_STALE_SELECTION_MESSAGE,
      shouldPrefixError: false,
    };
  }

  return {
    ok: true,
    detail: {
      ok: true,
      componentId: options.componentId,
      props: detailedComponent.props,
      hooks: detailedComponent.hooks,
      hookCount: detailedComponent.hookCount,
    },
  };
}

export { resolveDetailFetchPayload };
export type { DetailFetchPayloadResolution };
