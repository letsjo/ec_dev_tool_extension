import { describe, expect, it } from 'vitest';
import {
  inferHookName,
  normalizeHookStateForDisplay,
} from '../../src/content/hooks/pageAgentHookState';

describe('pageAgentHookState', () => {
  it('infers hook names from hookTypes and queue/reducer patterns', () => {
    expect(inferHookName(null, 0, ['useMemo'])).toBe('Hook#1');
    expect(inferHookName({ queue: { lastRenderedReducer: () => null } }, 0, ['useReducer'])).toBe(
      'Reducer',
    );
    expect(
      inferHookName(
        {
          queue: {
            lastRenderedReducer: function basicStateReducer() {
              return null;
            },
          },
        },
        0,
        ['useState'],
      ),
    ).toBe('State');
  });

  it('infers hook names from memoizedState shapes', () => {
    expect(inferHookName({ memoizedState: { current: 1 } }, 1, null)).toBe('Ref');
    expect(inferHookName({ memoizedState: [() => 1, []] }, 2, null)).toBe('Callback');
    expect(inferHookName({ memoizedState: ['value', []] }, 3, null)).toBe('Memo');
    expect(inferHookName({ memoizedState: { create: () => {}, destroy: () => {} } }, 4, null)).toBe(
      'Effect',
    );
    expect(inferHookName({ memoizedState: 1 }, 5, null)).toBe('Hook#6');
  });

  it('normalizes ref state current value for elements', () => {
    const div = document.createElement('div');
    expect(normalizeHookStateForDisplay('Ref', { current: div })).toBe('<div />');
    expect(normalizeHookStateForDisplay('Ref', { current: 42 })).toBe(42);
    expect(normalizeHookStateForDisplay('State', { current: div })).toEqual({ current: div });
  });
});
