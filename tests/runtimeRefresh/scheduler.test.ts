import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRuntimeRefreshScheduler } from '../../src/features/panel/runtimeRefresh/scheduler';

interface SchedulerHarnessOptions {
  minIntervalMs?: number;
  debounceMs?: number;
  isPickerModeActive?: () => boolean;
  getLookup?: () => { selector: string };
  runRefresh?: (
    lookup: { selector: string },
    background: boolean,
    onDone: () => void,
  ) => void;
}

function createSchedulerHarness(options: SchedulerHarnessOptions = {}) {
  const runRefresh =
    options.runRefresh ??
    vi.fn((_lookup, _background, onDone: () => void) => {
      onDone();
    });
  const scheduler = createRuntimeRefreshScheduler({
    minIntervalMs: options.minIntervalMs ?? 1000,
    debounceMs: options.debounceMs ?? 100,
    isPickerModeActive: options.isPickerModeActive ?? (() => false),
    getLookup: options.getLookup ?? (() => ({ selector: '#root' })),
    runRefresh,
  });
  return {
    scheduler,
    runRefresh,
  };
}

describe('createRuntimeRefreshScheduler', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(10_000);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('coalesces burst schedules with debounce', () => {
    const harness = createSchedulerHarness({
      minIntervalMs: 0,
      debounceMs: 120,
    });

    harness.scheduler.schedule(true);
    harness.scheduler.schedule(true);
    harness.scheduler.schedule(true);
    vi.advanceTimersByTime(119);
    expect(harness.runRefresh).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(harness.runRefresh).toHaveBeenCalledTimes(1);
  });

  it('reads latest lookup when debounced schedule flushes', () => {
    let lookup = { selector: '#first' };
    const runRefresh = vi.fn((_lookup, _background, onDone: () => void) => {
      onDone();
    });
    const harness = createSchedulerHarness({
      minIntervalMs: 0,
      debounceMs: 120,
      getLookup: () => lookup,
      runRefresh,
    });

    harness.scheduler.schedule(true);
    lookup = { selector: '#latest' };
    vi.advanceTimersByTime(120);

    expect(runRefresh).toHaveBeenCalledTimes(1);
    expect(runRefresh).toHaveBeenCalledWith(
      { selector: '#latest' },
      true,
      expect.any(Function),
    );
  });

  it('enforces min interval for background refresh', () => {
    const harness = createSchedulerHarness({
      minIntervalMs: 1000,
      debounceMs: 100,
    });

    harness.scheduler.refresh(true);
    expect(harness.runRefresh).toHaveBeenCalledTimes(1);

    harness.scheduler.refresh(true);
    vi.advanceTimersByTime(999);
    expect(harness.runRefresh).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(1);
    expect(harness.runRefresh).toHaveBeenCalledTimes(2);
  });

  it('runs queued refresh after in-flight refresh completes', () => {
    const callbacks: Array<() => void> = [];
    const runRefresh = vi.fn((_lookup, _background, onDone: () => void) => {
      callbacks.push(onDone);
    });
    const harness = createSchedulerHarness({
      minIntervalMs: 0,
      debounceMs: 80,
      runRefresh,
    });

    harness.scheduler.refresh(true);
    harness.scheduler.refresh(true);
    expect(harness.runRefresh).toHaveBeenCalledTimes(1);

    callbacks[0]?.();
    vi.advanceTimersByTime(79);
    expect(harness.runRefresh).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(1);
    expect(harness.runRefresh).toHaveBeenCalledTimes(2);
  });

  it('uses latest lookup for queued refresh after in-flight completion', () => {
    let lookup = { selector: '#initial' };
    const callbacks: Array<() => void> = [];
    const runRefresh = vi.fn((lookupArg, _background, onDone: () => void) => {
      callbacks.push(onDone);
      return lookupArg;
    });
    const harness = createSchedulerHarness({
      minIntervalMs: 0,
      debounceMs: 80,
      getLookup: () => lookup,
      runRefresh,
    });

    harness.scheduler.refresh(true);
    harness.scheduler.refresh(true);
    expect(runRefresh).toHaveBeenCalledTimes(1);
    expect(runRefresh).toHaveBeenNthCalledWith(
      1,
      { selector: '#initial' },
      true,
      expect.any(Function),
    );

    lookup = { selector: '#queued-latest' };
    callbacks[0]?.();
    vi.advanceTimersByTime(80);

    expect(runRefresh).toHaveBeenCalledTimes(2);
    expect(runRefresh).toHaveBeenNthCalledWith(
      2,
      { selector: '#queued-latest' },
      true,
      expect.any(Function),
    );
  });

  it('reset clears pending timer and queued follow-up', () => {
    const callbacks: Array<() => void> = [];
    const runRefresh = vi.fn((_lookup, _background, onDone: () => void) => {
      callbacks.push(onDone);
    });
    const harness = createSchedulerHarness({
      minIntervalMs: 0,
      debounceMs: 100,
      runRefresh,
    });

    harness.scheduler.schedule(true);
    harness.scheduler.reset();
    vi.advanceTimersByTime(100);
    expect(harness.runRefresh).not.toHaveBeenCalled();

    harness.scheduler.refresh(true);
    harness.scheduler.refresh(true);
    expect(harness.runRefresh).toHaveBeenCalledTimes(1);
    harness.scheduler.reset();

    callbacks[0]?.();
    vi.advanceTimersByTime(200);
    expect(harness.runRefresh).toHaveBeenCalledTimes(1);
  });

  it('dispose cancels timers and blocks further scheduling', () => {
    const callbacks: Array<() => void> = [];
    const runRefresh = vi.fn((_lookup, _background, onDone: () => void) => {
      callbacks.push(onDone);
    });
    const harness = createSchedulerHarness({
      minIntervalMs: 0,
      debounceMs: 100,
      runRefresh,
    });

    harness.scheduler.schedule(true);
    harness.scheduler.dispose();
    vi.advanceTimersByTime(1000);
    expect(harness.runRefresh).not.toHaveBeenCalled();

    harness.scheduler.refresh(true);
    harness.scheduler.schedule(true);
    vi.advanceTimersByTime(1000);
    expect(harness.runRefresh).not.toHaveBeenCalled();

    // dispose 이후에 늦게 도착한 onDone 콜백도 후속 스케줄을 만들지 않아야 한다.
    callbacks[0]?.();
    vi.advanceTimersByTime(200);
    expect(harness.runRefresh).not.toHaveBeenCalled();
  });
});
