import type {
  PickPoint,
  ReactComponentDetailResult,
  ReactComponentInfo,
} from '../../../../shared/inspector/types';
import {
  createReactDetailQueueMutableState,
  finishDetailRequest,
  getDetailRequestLastFailedAt,
  isWithinDetailFailureCooldown,
  markDetailRequestApplied,
  markDetailRequestFailed,
  queueDetailRequestWhileInFlight,
  resetDetailQueueState,
  startDetailRequest,
} from './detailFetchQueueState';
import {
  buildDetailFetchFailureText,
  DETAIL_FETCH_STALE_SELECTION_MESSAGE,
} from './detailFetchQueueMessages';
import { resolveDetailFetchPayload } from './detailFetchQueueResponse';

type CallInspectedPageAgent = (
  method: string,
  args: unknown,
  onDone: (result: unknown | null, errorText?: string) => void,
) => void;

interface RuntimeLookup {
  selector: string;
  pickPoint?: PickPoint;
}

interface CreateReactDetailFetchQueueOptions {
  cooldownMs: number;
  callInspectedPageAgent: CallInspectedPageAgent;
  getLookup: () => RuntimeLookup;
  getSelectedComponent: () => ReactComponentInfo | null;
  findComponentById: (componentId: string) => ReactComponentInfo | undefined;
  applySelectedComponentDetail: (result: ReactComponentDetailResult) => boolean;
  setReactDetailEmpty: (text: string) => void;
}

interface ReactDetailFetchQueue {
  request: (component: ReactComponentInfo) => void;
  getLastFailedAt: (componentId: string) => number | undefined;
  reset: () => void;
}

/** 상세조회 완료 후 큐를 이어서 소비한다. */
function consumeQueuedRequest(
  queueState: ReturnType<typeof createReactDetailQueueMutableState>,
  currentComponentId: string,
  findComponentById: CreateReactDetailFetchQueueOptions['findComponentById'],
  request: (component: ReactComponentInfo) => void,
) {
  const nextQueuedComponentId = finishDetailRequest(queueState, currentComponentId);
  if (!nextQueuedComponentId) return;

  const queuedComponent = findComponentById(nextQueuedComponentId);
  if (!queuedComponent || queuedComponent.hasSerializedData !== false) return;
  request(queuedComponent);
}

/**
 * 선택 컴포넌트 상세(props/hooks) 지연 조회 큐를 구성한다.
 * - in-flight 중복 요청은 마지막 componentId 하나로 병합한다.
 * - 최근 실패한 componentId는 cooldown 동안 재시도를 지연한다.
 */
export function createReactDetailFetchQueue(
  options: CreateReactDetailFetchQueueOptions,
): ReactDetailFetchQueue {
  const queueState = createReactDetailQueueMutableState();

  /** 비동기 상세 데이터를 요청 */
  function request(component: ReactComponentInfo) {
    const componentId = component.id;
    if (!componentId) return;

    if (queueState.inFlight) {
      queueDetailRequestWhileInFlight(queueState, componentId);
      return;
    }

    if (
      isWithinDetailFailureCooldown(
        queueState,
        componentId,
        Date.now(),
        options.cooldownMs,
      )
    ) {
      return;
    }

    const lookup = options.getLookup();
    const selector = component.domSelector ?? lookup.selector;
    const pickPoint = component.domSelector ? undefined : lookup.pickPoint;
    startDetailRequest(queueState);

    options.callInspectedPageAgent(
      'reactInspect',
      {
        selector,
        pickPoint: pickPoint ?? null,
        includeSerializedData: false,
        selectedComponentId: componentId,
      },
      (response, errorText) => {
        const selected = options.getSelectedComponent();
        const isCurrentSelection = selected?.id === componentId;

        const payload = resolveDetailFetchPayload({
          response,
          errorText: errorText ?? undefined,
          componentId,
        });

        if (!payload.ok) {
          markDetailRequestFailed(queueState, componentId, Date.now());
          if (isCurrentSelection) {
            options.setReactDetailEmpty(
              payload.shouldPrefixError
                ? buildDetailFetchFailureText(payload.reason)
                : payload.reason,
            );
          }
          consumeQueuedRequest(queueState, componentId, options.findComponentById, request);
          return;
        }

        const applied = options.applySelectedComponentDetail(payload.detail);
        markDetailRequestApplied(queueState, componentId, applied, Date.now());

        if (!applied && isCurrentSelection) {
          options.setReactDetailEmpty(DETAIL_FETCH_STALE_SELECTION_MESSAGE);
        }

        consumeQueuedRequest(queueState, componentId, options.findComponentById, request);
      },
    );
  }

  /** 최근 실패 시각을 조회한다. 상세 패널의 재시도 문구 판단에 사용한다. */
  function getLastFailedAt(componentId: string) {
    return getDetailRequestLastFailedAt(queueState, componentId);
  }

  /** 네비게이션/검색 상태 변경 시 상세조회 큐 상태를 초기화한다. */
  function reset() {
    resetDetailQueueState(queueState);
  }

  return {
    request,
    getLastFailedAt,
    reset,
  };
}
