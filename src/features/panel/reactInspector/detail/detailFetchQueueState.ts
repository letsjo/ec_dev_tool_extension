export interface ReactDetailQueueMutableState {
  inFlight: boolean;
  queuedComponentId: string | null;
  lastFailedAtById: Map<string, number>;
}

/** detail fetch queue mutable 상태 컨테이너를 생성한다. */
export function createReactDetailQueueMutableState(): ReactDetailQueueMutableState {
  return {
    inFlight: false,
    queuedComponentId: null,
    lastFailedAtById: new Map<string, number>(),
  };
}

/** in-flight 요청이 있는 동안 마지막 요청 대상만 큐에 보관한다. */
export function queueDetailRequestWhileInFlight(
  state: ReactDetailQueueMutableState,
  componentId: string,
) {
  state.queuedComponentId = componentId;
}

/** 현재 요청을 시작 상태로 표시한다. */
export function startDetailRequest(state: ReactDetailQueueMutableState) {
  state.inFlight = true;
}

/**
 * 요청 종료 후 다음 큐 항목을 꺼낸다.
 * 동일 componentId 재요청은 무의미하므로 건너뛴다.
 */
export function finishDetailRequest(
  state: ReactDetailQueueMutableState,
  currentComponentId: string,
): string | null {
  state.inFlight = false;
  const nextQueuedComponentId = state.queuedComponentId;
  state.queuedComponentId = null;

  if (!nextQueuedComponentId || nextQueuedComponentId === currentComponentId) {
    return null;
  }
  return nextQueuedComponentId;
}

/** 최근 실패 시각이 cooldown 이내인지 확인한다. */
export function isWithinDetailFailureCooldown(
  state: ReactDetailQueueMutableState,
  componentId: string,
  now: number,
  cooldownMs: number,
): boolean {
  const lastFailedAt = state.lastFailedAtById.get(componentId);
  return Boolean(lastFailedAt && now - lastFailedAt < cooldownMs);
}

/** 상세 조회 실패 시각을 기록한다. */
export function markDetailRequestFailed(
  state: ReactDetailQueueMutableState,
  componentId: string,
  failedAt: number,
) {
  state.lastFailedAtById.set(componentId, failedAt);
}

/** 상세 적용 성공 시 실패 기록을 제거하고, 실패 시각은 최신으로 갱신한다. */
export function markDetailRequestApplied(
  state: ReactDetailQueueMutableState,
  componentId: string,
  applied: boolean,
  now: number,
) {
  if (applied) {
    state.lastFailedAtById.delete(componentId);
    return;
  }
  state.lastFailedAtById.set(componentId, now);
}

/** 컴포넌트별 최근 실패 시각을 조회한다. */
export function getDetailRequestLastFailedAt(
  state: ReactDetailQueueMutableState,
  componentId: string,
): number | undefined {
  return state.lastFailedAtById.get(componentId);
}

/** 네비게이션/검색 변경 시 queue 상태를 초기화한다. */
export function resetDetailQueueState(state: ReactDetailQueueMutableState) {
  state.inFlight = false;
  state.queuedComponentId = null;
  state.lastFailedAtById = new Map<string, number>();
}
