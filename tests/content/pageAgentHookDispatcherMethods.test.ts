import { describe, expect, it } from 'vitest';
import { createHookInspectDispatcherMethods } from '../../src/content/pageAgentHookDispatcherMethods';

type AnyRecord = Record<string, any>;

function createHarness(hooks: Array<{ memoizedState?: unknown }>) {
  const state = {
    currentHook: null,
    suspendedToken: null,
    hookLog: [],
  } as AnyRecord;

  let hookIndex = 0;
  const nextHook = () => {
    const hook = hooks[hookIndex] ?? null;
    hookIndex += 1;
    state.currentHook = hooks[hookIndex] ?? null;
    return hook;
  };

  const methods = createHookInspectDispatcherMethods({
    state,
    nextHook,
    readHookMemoizedState() {
      const hook = nextHook();
      if (!hook || !Object.prototype.hasOwnProperty.call(hook, 'memoizedState')) return undefined;
      return hook.memoizedState;
    },
    pushHookLog(primitive: string, dispatcherHookName: string, value: unknown) {
      state.hookLog.push({ primitive, dispatcherHookName, value });
    },
    readContextSnapshot(context: AnyRecord | null | undefined) {
      if (!context || typeof context !== 'object') {
        return { hasValue: false, value: undefined };
      }
      if (Object.prototype.hasOwnProperty.call(context, '_currentValue2')) {
        return { hasValue: true, value: context._currentValue2 };
      }
      if (Object.prototype.hasOwnProperty.call(context, '_currentValue')) {
        return { hasValue: true, value: context._currentValue };
      }
      return { hasValue: false, value: undefined };
    },
  });

  return {
    state,
    methods: methods as Record<string, any>,
  };
}

describe('pageAgentHookDispatcherMethods', () => {
  it('returns memoized snapshot for useSyncExternalStore', () => {
    const { methods, state } = createHarness([
      { memoizedState: 'snapshot' },
      { memoizedState: null },
      { memoizedState: null },
    ]);

    const value = methods.useSyncExternalStore(
      () => undefined,
      () => 'from-getSnapshot',
    );

    expect(value).toBe('snapshot');
    expect(state.hookLog[0]).toEqual({
      primitive: 'SyncExternalStore',
      dispatcherHookName: 'SyncExternalStore',
      value: 'snapshot',
    });
  });

  it('computes transition pending flag from first transition hook', () => {
    const { methods, state } = createHarness([
      { memoizedState: 1 },
      { memoizedState: null },
    ]);

    const [pending] = methods.useTransition();

    expect(pending).toBe(true);
    expect(state.hookLog[0].primitive).toBe('Transition');
  });

  it('handles use() unresolved promise and resolved value paths', () => {
    const unresolved = createHarness([]);
    const promiseLike = { then() {} };

    let thrown: unknown;
    try {
      unresolved.methods.use(promiseLike);
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBe(unresolved.state.suspendedToken);
    expect(unresolved.state.hookLog[0]).toEqual({
      primitive: 'Unresolved',
      dispatcherHookName: 'Use',
      value: promiseLike,
    });

    const resolved = createHarness([{ memoizedState: 'resolved' }]);
    const resolvedValue = resolved.methods.use(promiseLike);
    expect(resolvedValue).toBe('resolved');
    expect(resolved.state.hookLog[0].primitive).toBe('Promise');
  });

  it('reads context values through use() context path', () => {
    const { methods, state } = createHarness([{}]);

    const value = methods.use({ _currentValue2: 'ctx-value' });

    expect(value).toBe('ctx-value');
    expect(state.hookLog[0]).toEqual({
      primitive: 'Context',
      dispatcherHookName: 'Use',
      value: 'ctx-value',
    });
  });
});
