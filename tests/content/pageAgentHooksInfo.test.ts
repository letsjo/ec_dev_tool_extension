import { describe, expect, it } from 'vitest';
import { createPageAgentHooksInfoHelpers } from '../../src/content/pageAgentHooksInfo';

type AnyRecord = Record<string, any>;

describe('createPageAgentHooksInfoHelpers', () => {
  it('normalizes function component hook linked-list without custom group metadata', () => {
    const refTarget = document.createElement('span');
    const secondHook = {
      memoizedState: {
        current: refTarget,
      },
      next: null,
    } as AnyRecord;
    const firstHook = {
      memoizedState: 123,
      next: secondHook,
    } as AnyRecord;

    const helpers = createPageAgentHooksInfoHelpers({
      getFiberName: () => 'DemoComponent',
    });

    const hooks = helpers.getHooksRootValue(
      {
        tag: 0,
        memoizedState: firstHook,
        _debugHookTypes: ['State', 'Ref'],
      },
      { includeCustomGroups: false },
    );

    expect(hooks).toHaveLength(2);
    expect(hooks[0].name).toBe('State');
    expect(hooks[0].state).toBe(123);
    expect(hooks[1].name).toBe('Ref');
    expect(hooks[1].state).toBe('<span />');
    expect(helpers.getHooksCount({ tag: 0, memoizedState: firstHook })).toBe(2);
  });

  it('serializes class component state through getHooksInfo', () => {
    const helpers = createPageAgentHooksInfoHelpers({
      getFiberName: () => 'ClassDemo',
    });

    const result = helpers.getHooksInfo({
      tag: 1,
      memoizedState: {
        count: 3,
      },
    });

    expect(result.count).toBe(1);
    expect(result.value).toHaveLength(1);
    expect(result.value[0].name).toBe('ClassState');
    expect(result.value[0].index).toBe(0);
    expect(result.value[0].group).toBeNull();
    expect(result.value[0].groupPath).toBeNull();
    expect(result.value[0].state).toEqual(
      expect.objectContaining({
        count: 3,
      }),
    );
  });

  it('falls back safely when includeCustomGroups option payload is invalid', () => {
    const helpers = createPageAgentHooksInfoHelpers({
      getFiberName: () => 'InvalidOptionComp',
    });

    const hooks = helpers.getHooksRootValue(
      {
        tag: 0,
        memoizedState: {
          memoizedState: 'state-value',
          next: null,
        },
      },
      'invalid-option-payload',
    );

    expect(hooks).toHaveLength(1);
    expect(hooks[0].name).toContain('Hook#');
    expect(hooks[0].state).toBe('state-value');
  });
});
