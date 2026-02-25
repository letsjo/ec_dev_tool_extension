import type { PickPoint } from '../../../shared/inspector/types';

interface RuntimeRefreshLookup {
  selector: string;
  pickPoint?: PickPoint;
}

interface CreateRuntimeRefreshSchedulerOptions {
  minIntervalMs: number;
  debounceMs: number;
  isPickerModeActive: () => boolean;
  getLookup: () => RuntimeRefreshLookup;
  runRefresh: (lookup: RuntimeRefreshLookup, background: boolean, onDone: () => void) => void;
}

export interface RuntimeRefreshScheduler {
  schedule: (background?: boolean, minDelayMs?: number) => void;
  refresh: (background?: boolean) => void;
  reset: () => void;
  dispose: () => void;
}

/**
 * 런타임 자동 갱신 스케줄러를 구성한다.
 * - in-flight 중복 호출은 queued 플래그로 병합
 * - background 갱신은 최소 간격(minIntervalMs) 보장
 * - 이벤트 burst는 debounce 타이머로 흡수
 */
export function createRuntimeRefreshScheduler(
  options: CreateRuntimeRefreshSchedulerOptions,
): RuntimeRefreshScheduler {
  let inFlight = false;
  let queued = false;
  let timer: number | null = null;
  let lastRefreshAt = 0;
  let disposed = false;

  /** 현재 예약 타이머를 안전하게 해제한다. */
  function clearTimer() {
    if (timer === null) return;
    window.clearTimeout(timer);
    timer = null;
  }

  /** 지연 실행을 예약한다. 이미 예약되어 있으면 기존 예약을 유지한다. */
  function schedule(background = true, minDelayMs = 0) {
    if (disposed || timer !== null) return;
    const delay = Math.max(options.debounceMs, minDelayMs);
    timer = window.setTimeout(() => {
      timer = null;
      refresh(background);
    }, delay);
  }

  /** 런타임 변경 이벤트를 기준으로 React 재조회 루프를 실행한다. */
  function refresh(background = true) {
    if (disposed || options.isPickerModeActive()) return;

    if (inFlight) {
      queued = true;
      return;
    }

    if (background) {
      const elapsed = Date.now() - lastRefreshAt;
      const remaining = options.minIntervalMs - elapsed;
      if (remaining > 0) {
        schedule(true, remaining);
        return;
      }
    }

    inFlight = true;
    lastRefreshAt = Date.now();
    const lookup = options.getLookup();
    options.runRefresh(lookup, background, () => {
      if (disposed) return;
      inFlight = false;
      if (queued) {
        queued = false;
        schedule(true);
      }
    });
  }

  /** 네비게이션 등 상태 전환 시 내부 스케줄 상태를 초기화한다. */
  function reset() {
    inFlight = false;
    queued = false;
    clearTimer();
    lastRefreshAt = 0;
  }

  /** 패널 종료 시 타이머와 후속 스케줄링을 정리한다. */
  function dispose() {
    disposed = true;
    reset();
  }

  return {
    schedule,
    refresh,
    reset,
    dispose,
  };
}
