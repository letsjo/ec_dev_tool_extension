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
