import { describe, expect, it } from 'vitest';
import { createHookInspectContext } from '../../src/content/pageAgentHookInspectContext';

describe('pageAgentHookInspectContext', () => {
  it('builds dispatcher context and primitive warmup cache', () => {
    const context = createHookInspectContext({
      initialHookState: null,
    });

    expect(context.inspectState.currentHook).toBeNull();
    expect(context.inspectState.suspendedToken).toBeNull();
    expect(context.inspectState.hookLog).toHaveLength(0);
    expect(typeof (context.dispatcherProxy as Record<string, unknown>).useState).toBe('function');
    expect(context.primitiveStackCache.size).toBeGreaterThan(0);
    expect(context.primitiveStackCache.has('State')).toBe(true);
  });
});
