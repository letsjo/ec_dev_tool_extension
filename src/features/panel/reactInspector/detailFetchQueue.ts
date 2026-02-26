import { isReactInspectResult } from '../../../shared/inspector/guards';
import type {
  PickPoint,
  ReactComponentDetailResult,
  ReactComponentInfo,
} from '../../../shared/inspector/types';
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

/**
 * 선택 컴포넌트 상세(props/hooks) 지연 조회 큐를 구성한다.
 * - in-flight 중복 요청은 마지막 componentId 하나로 병합한다.
 * - 최근 실패한 componentId는 cooldown 동안 재시도를 지연한다.
 */
export function createReactDetailFetchQueue(
  options: CreateReactDetailFetchQueueOptions,
): ReactDetailFetchQueue {
  const queueState = createReactDetailQueueMutableState();

  /** 상세조회 완료 후 큐를 이어서 소비한다. */
  function finishRequest(currentComponentId: string, request: (component: ReactComponentInfo) => void) {
    const nextQueuedComponentId = finishDetailRequest(queueState, currentComponentId);
    if (!nextQueuedComponentId) return;

    const queuedComponent = options.findComponentById(nextQueuedComponentId);
    if (!queuedComponent || queuedComponent.hasSerializedData !== false) return;
    request(queuedComponent);
  }

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
      (res, errorText) => {
        const selected = options.getSelectedComponent();
        const isCurrentSelection = selected?.id === componentId;

        if (errorText) {
          markDetailRequestFailed(queueState, componentId, Date.now());
          if (isCurrentSelection) {
            options.setReactDetailEmpty(`상세 정보 조회 실패: ${errorText}`);
          }
          finishRequest(componentId, request);
          return;
        }

        if (!isReactInspectResult(res)) {
          const reason = '응답 형식 오류';
          markDetailRequestFailed(queueState, componentId, Date.now());
          if (isCurrentSelection) {
            options.setReactDetailEmpty(`상세 정보 조회 실패: ${reason}`);
          }
          finishRequest(componentId, request);
          return;
        }

        const detailedComponent = res.components.find((candidate) => candidate.id === componentId);
        if (!detailedComponent || detailedComponent.hasSerializedData === false) {
          markDetailRequestFailed(queueState, componentId, Date.now());
          if (isCurrentSelection) {
            options.setReactDetailEmpty('선택 컴포넌트를 갱신하지 못했습니다. 다시 선택해 주세요.');
          }
          finishRequest(componentId, request);
          return;
        }

        const applied = options.applySelectedComponentDetail({
          ok: true,
          componentId,
          props: detailedComponent.props,
          hooks: detailedComponent.hooks,
          hookCount: detailedComponent.hookCount,
        });

        markDetailRequestApplied(queueState, componentId, applied, Date.now());
        if (!applied) {
          if (isCurrentSelection) {
            options.setReactDetailEmpty('선택 컴포넌트를 갱신하지 못했습니다. 다시 선택해 주세요.');
          }
        }

        finishRequest(componentId, request);
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
