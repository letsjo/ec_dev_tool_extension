import { describe, expect, it } from 'vitest';
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
} from '../../src/features/panel/reactInspector/detail/detailFetchQueueState';

describe('detailFetchQueueState', () => {
  it('tracks in-flight queue transitions and skips same component replay', () => {
    const state = createReactDetailQueueMutableState();

    startDetailRequest(state);
    queueDetailRequestWhileInFlight(state, 'a');
    expect(finishDetailRequest(state, 'a')).toBeNull();
    expect(state.inFlight).toBe(false);

    startDetailRequest(state);
    queueDetailRequestWhileInFlight(state, 'b');
    expect(finishDetailRequest(state, 'a')).toBe('b');
    expect(state.inFlight).toBe(false);
  });

  it('records failure timestamps and clears them on applied success', () => {
    const state = createReactDetailQueueMutableState();
    markDetailRequestFailed(state, 'cmp-1', 1000);

    expect(getDetailRequestLastFailedAt(state, 'cmp-1')).toBe(1000);
    expect(isWithinDetailFailureCooldown(state, 'cmp-1', 1200, 500)).toBe(true);
    expect(isWithinDetailFailureCooldown(state, 'cmp-1', 1700, 500)).toBe(false);

    markDetailRequestApplied(state, 'cmp-1', true, 2000);
    expect(getDetailRequestLastFailedAt(state, 'cmp-1')).toBeUndefined();

    markDetailRequestApplied(state, 'cmp-1', false, 2500);
    expect(getDetailRequestLastFailedAt(state, 'cmp-1')).toBe(2500);
  });

  it('resets queue state on navigation/search reset', () => {
    const state = createReactDetailQueueMutableState();
    startDetailRequest(state);
    queueDetailRequestWhileInFlight(state, 'cmp-2');
    markDetailRequestFailed(state, 'cmp-2', 3333);

    resetDetailQueueState(state);

    expect(state.inFlight).toBe(false);
    expect(state.queuedComponentId).toBeNull();
    expect(state.lastFailedAtById.size).toBe(0);
  });
});
