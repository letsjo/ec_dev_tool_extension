import { describe, expect, it } from 'vitest';
import { createHookInspectDispatcher } from '../../src/content/pageAgentHookDispatcher';

describe('pageAgentHookDispatcher', () => {
  it('reads memoized state for useState and advances hook cursor', () => {
    const state = {
      currentHook: { memoizedState: 7, next: null },
      suspendedToken: null,
      hookLog: [],
    };

    const { dispatcherProxy } = createHookInspectDispatcher(state);
    const [value, setValue] = (dispatcherProxy as Record<string, any>).useState(0);

    expect(value).toBe(7);
    expect(typeof setValue).toBe('function');
    expect(state.currentHook).toBeNull();
    expect(state.hookLog).toHaveLength(1);
    expect(state.hookLog[0].primitive).toBe('State');
    expect(state.hookLog[0].dispatcherHookName).toBe('State');
    expect(state.hookLog[0].value).toBe(7);
  });

  it('handles unresolved/resolved promise use() flow', () => {
    const state = {
      currentHook: null,
      suspendedToken: null,
      hookLog: [],
    };
    const promiseLike = { then() {} };
    const { dispatcherProxy } = createHookInspectDispatcher(state);

    let thrown: unknown;
    try {
      (dispatcherProxy as Record<string, any>).use(promiseLike);
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBe(state.suspendedToken);
    expect(state.hookLog[0].primitive).toBe('Unresolved');
    expect(state.hookLog[0].dispatcherHookName).toBe('Use');

    state.currentHook = { memoizedState: 'resolved-value', next: null };
    const resolvedValue = (dispatcherProxy as Record<string, any>).use(promiseLike);
    expect(resolvedValue).toBe('resolved-value');
    expect(state.hookLog[1].primitive).toBe('Promise');
  });

  it('reads context snapshot values from useContext/readContext', () => {
    const state = {
      currentHook: null,
      suspendedToken: null,
      hookLog: [],
    };
    const { dispatcherProxy } = createHookInspectDispatcher(state);

    const valueFromUseContext = (dispatcherProxy as Record<string, any>).useContext({
      _currentValue2: 'ctx-v2',
    });
    const valueFromReadContext = (dispatcherProxy as Record<string, any>).readContext({
      _currentValue: 'ctx-v1',
    });

    expect(valueFromUseContext).toBe('ctx-v2');
    expect(valueFromReadContext).toBe('ctx-v1');
    expect(state.hookLog.map((entry: Record<string, unknown>) => entry.primitive)).toEqual([
      'Context',
      'Context',
    ]);
  });

  it('falls back to generic hook parser for unknown dispatcher methods', () => {
    const state = {
      currentHook: null,
      suspendedToken: null,
      hookLog: [],
    };
    const { dispatcherProxy } = createHookInspectDispatcher(state);

    const value = (dispatcherProxy as Record<string, any>).useFancyFeature('value');

    expect(value).toBe('value');
    expect(state.hookLog).toHaveLength(1);
    expect(state.hookLog[0].primitive).toBe('FancyFeature');
    expect(state.hookLog[0].dispatcherHookName).toBe('FancyFeature');
  });
});
