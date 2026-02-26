import { describe, expect, it } from 'vitest';
import { applyCustomHookMetadata } from '../../src/content/pageAgentHookMetadata';

describe('pageAgentHookMetadata', () => {
  it('returns hooks as-is when metadata is missing', () => {
    const hooks = [
      {
        index: 0,
        name: 'State',
        state: 1,
        group: null,
        groupPath: null,
      },
    ];

    expect(applyCustomHookMetadata(hooks, null)).toBe(hooks);
    expect(applyCustomHookMetadata(hooks, undefined)).toBe(hooks);
  });

  it('expands hooks and merges primitive/group metadata fields', () => {
    const hooks = [
      {
        index: 0,
        name: 'Hook#1',
        state: undefined,
        group: null,
        groupPath: null,
      },
    ];

    const result = applyCustomHookMetadata(hooks, {
      groupNames: ['Auth', 'Session'],
      groupPaths: [['Auth', 'State'], ['Session', 'Token']],
      primitiveNames: ['State', 'Ref'],
      primitiveValues: [1, { current: 2 }],
      primitiveHasValue: [true, true],
    });

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      name: 'State',
      state: 1,
      group: 'Auth',
      groupPath: ['Auth', 'State'],
    });
    expect(result[1]).toMatchObject({
      name: 'Ref',
      state: { current: 2 },
      group: 'Session',
      groupPath: ['Session', 'Token'],
    });
  });

  it('filters invalid groupPath entries and falls back to null for empty path', () => {
    const hooks = [
      {
        index: 0,
        name: 'Hook#1',
        state: undefined,
        group: null,
        groupPath: null,
      },
    ];

    const result = applyCustomHookMetadata(hooks, {
      groupPaths: [[null, '', 1], ['Valid', '', 'Path']],
      primitiveNames: ['State', 'Reducer'],
    });

    expect(result[0].groupPath).toBeNull();
    expect(result[1].groupPath).toEqual(['Valid', 'Path']);
  });
});
