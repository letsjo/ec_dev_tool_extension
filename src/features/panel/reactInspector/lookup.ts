import type { PickPoint } from '../../../shared/inspector/types';

export interface RuntimeRefreshLookup {
  selector: string;
  pickPoint?: PickPoint;
}

/**
 * fetch 옵션의 keepLookup 규칙에 따라 저장 lookup을 갱신한다.
 * keepLookup=true면 기존 값을 유지하고, 아니면 새 selector/pickPoint로 교체한다.
 */
export function resolveStoredLookup(
  currentLookup: RuntimeRefreshLookup | null,
  nextLookup: RuntimeRefreshLookup,
  keepLookup: boolean,
): RuntimeRefreshLookup | null {
  if (keepLookup) {
    return currentLookup;
  }
  return nextLookup;
}

/** runtime refresh 스케줄러에 전달할 lookup을 계산한다. */
export function resolveRuntimeRefreshLookup(
  storedLookup: RuntimeRefreshLookup | null,
): RuntimeRefreshLookup {
  if (storedLookup && (storedLookup.selector || storedLookup.pickPoint)) {
    return storedLookup;
  }
  return { selector: '' };
}

interface ResolvedInspectPathLookup {
  selector: string;
  pickPoint: PickPoint | null;
}

/**
 * reactInspectPath 호출에 필요한 selector/pickPoint fallback 규칙을 계산한다.
 * - 컴포넌트에 domSelector가 있으면 selector 우선, pickPoint는 null
 * - 없으면 마지막 저장 lookup(selector/pickPoint)을 fallback으로 사용
 */
export function resolveInspectPathLookup(
  componentDomSelector: string | null,
  storedLookup: RuntimeRefreshLookup | null,
): ResolvedInspectPathLookup {
  return {
    selector: componentDomSelector ?? storedLookup?.selector ?? '',
    pickPoint: componentDomSelector ? null : (storedLookup?.pickPoint ?? null),
  };
}
