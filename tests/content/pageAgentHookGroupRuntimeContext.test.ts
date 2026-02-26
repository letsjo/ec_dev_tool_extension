import { afterEach, describe, expect, it } from 'vitest';
import type { FiberLike } from '../../src/content/pageAgentFiberSearchTypes';
import { resolveHookInspectRuntimeContext } from '../../src/content/pageAgentHookGroupRuntimeContext';

type HookWindow = Window & {
  __REACT_DEVTOOLS_GLOBAL_HOOK__?: unknown;
};

describe('pageAgentHookGroupRuntimeContext', () => {
  const hookWindow = window as HookWindow;
  const originalGlobalHook = hookWindow.__REACT_DEVTOOLS_GLOBAL_HOOK__;

  afterEach(() => {
    hookWindow.__REACT_DEVTOOLS_GLOBAL_HOOK__ = originalGlobalHook;
  });

  it('returns null for missing fiber or class component fiber', () => {
    expect(
      resolveHookInspectRuntimeContext({
        fiber: null,
        getFiberName: () => 'Component',
      }),
    ).toBeNull();

    expect(
      resolveHookInspectRuntimeContext({
        fiber: { tag: 1 } as FiberLike,
        getFiberName: () => 'ClassComp',
      }),
    ).toBeNull();
  });

  it('returns null when render function or dispatcher ref is unavailable', () => {
    hookWindow.__REACT_DEVTOOLS_GLOBAL_HOOK__ = { renderers: new Map() };
    expect(
      resolveHookInspectRuntimeContext({
        fiber: { tag: 0, type: null } as FiberLike,
        getFiberName: () => 'Unknown',
      }),
    ).toBeNull();
  });

  it('builds runtime context when render function and dispatcher ref are available', () => {
    hookWindow.__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
      renderers: new Map([
        [
          1,
          {
            currentDispatcherRef: {
              H: { current: 'dispatcher' },
            },
          },
        ],
      ]),
    };
    const fiber = {
      tag: 0,
      type() {
        return null;
      },
      memoizedState: {},
    } as FiberLike;

    const result = resolveHookInspectRuntimeContext({
      fiber,
      getFiberName: () => 'FunctionComp',
    });

    expect(result).toEqual(
      expect.objectContaining({
        fiber,
        componentName: 'FunctionComp',
      }),
    );
    expect(typeof result?.renderFn).toBe('function');
    expect(result?.dispatcherRef.H).toEqual({ current: 'dispatcher' });
  });
});
