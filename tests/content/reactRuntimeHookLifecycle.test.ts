import { describe, expect, it } from 'vitest';
import { installRuntimeHook } from '../../src/content/reactRuntimeHookLifecycle';

type AnyRecord = Record<string, any>;

interface RuntimeWindowHarness {
  runtimeWindow: AnyRecord;
  posted: Array<Record<string, any>>;
  dispatchBeforeUnload: () => void;
  setNow: (value: number) => void;
  getClearedTimerIds: () => number[];
}

function createRuntimeWindowHarness(): RuntimeWindowHarness {
  const posted: Array<Record<string, any>> = [];
  const listeners = new Map<string, Array<(...args: unknown[]) => void>>();
  const clearedTimerIds: number[] = [];
  let nextTimerId = 1;
  let nowValue = 1000;

  const runtimeWindow: AnyRecord = {
    postMessage(payload: Record<string, any>) {
      posted.push(payload);
    },
    setInterval() {
      const id = nextTimerId;
      nextTimerId += 1;
      return id;
    },
    clearInterval(timerId: number) {
      clearedTimerIds.push(timerId);
    },
    addEventListener(eventName: string, handler: (...args: unknown[]) => void) {
      const bucket = listeners.get(eventName) ?? [];
      bucket.push(handler);
      listeners.set(eventName, bucket);
    },
  };

  return {
    runtimeWindow,
    posted,
    dispatchBeforeUnload() {
      const handlers = listeners.get('beforeunload') ?? [];
      for (let i = 0; i < handlers.length; i += 1) {
        handlers[i]();
      }
    },
    setNow(value: number) {
      nowValue = value;
    },
    getClearedTimerIds() {
      return clearedTimerIds;
    },
  };
}

function installWithDefaults(harness: RuntimeWindowHarness) {
  let nowValue = 1000;
  installRuntimeHook(harness.runtimeWindow as Window, {
    messageSource: 'TEST_SOURCE',
    messageAction: 'reactCommit',
    stateKey: '__TEST_RUNTIME_HOOK_STATE__',
    wrappedKey: '__TEST_RUNTIME_WRAPPED__',
    postMinIntervalMs: 400,
    hookAttachIntervalMs: 2000,
    now: () => nowValue,
  });
  return {
    setNow(value: number) {
      nowValue = value;
    },
  };
}

describe('reactRuntimeHookLifecycle', () => {
  it('installs fallback hook and posts hook-installed message', () => {
    const harness = createRuntimeWindowHarness();

    installWithDefaults(harness);

    expect(typeof harness.runtimeWindow.__REACT_DEVTOOLS_GLOBAL_HOOK__).toBe('object');
    expect(harness.runtimeWindow.__TEST_RUNTIME_HOOK_STATE__).toEqual({
      installed: true,
      fallbackTimer: 1,
      lastPostedAt: 1000,
    });
    expect(harness.posted[0]).toMatchObject({
      source: 'TEST_SOURCE',
      action: 'reactCommit',
      reason: 'hook-installed',
    });
  });

  it('wraps commit hook methods and applies post throttle', () => {
    const harness = createRuntimeWindowHarness();
    const commitCalls: string[] = [];
    harness.runtimeWindow.__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
      onCommitFiberRoot() {
        commitCalls.push('commit');
      },
    };

    const clock = installWithDefaults(harness);
    const hook = harness.runtimeWindow.__REACT_DEVTOOLS_GLOBAL_HOOK__ as AnyRecord;

    clock.setNow(1500);
    hook.onCommitFiberRoot();
    clock.setNow(1600);
    hook.onCommitFiberRoot();

    const commitMessages = harness.posted.filter(
      (entry) => entry.reason === 'onCommitFiberRoot',
    );
    expect(commitCalls).toHaveLength(2);
    expect(commitMessages).toHaveLength(1);
  });

  it('intercepts hook setter and wraps later-assigned hooks', () => {
    const harness = createRuntimeWindowHarness();
    const clock = installWithDefaults(harness);

    harness.runtimeWindow.__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
      onPostCommitFiberRoot() {
        return 'post-commit';
      },
    };

    const hookSetMessages = harness.posted.filter((entry) => entry.reason === 'hook-set');
    expect(hookSetMessages).toHaveLength(1);

    const hook = harness.runtimeWindow.__REACT_DEVTOOLS_GLOBAL_HOOK__ as AnyRecord;
    clock.setNow(2000);
    const result = hook.onPostCommitFiberRoot();
    expect(result).toBe('post-commit');

    const postCommitMessages = harness.posted.filter(
      (entry) => entry.reason === 'onPostCommitFiberRoot',
    );
    expect(postCommitMessages).toHaveLength(1);
  });

  it('clears fallback timer on beforeunload', () => {
    const harness = createRuntimeWindowHarness();

    installWithDefaults(harness);

    harness.dispatchBeforeUnload();

    expect(harness.getClearedTimerIds()).toEqual([1]);
    expect(harness.runtimeWindow.__TEST_RUNTIME_HOOK_STATE__.fallbackTimer).toBeNull();
  });
});
