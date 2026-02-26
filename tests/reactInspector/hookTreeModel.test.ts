import { describe, expect, it } from 'vitest';
import { buildHookTree } from '../../src/features/panel/reactInspector/hookTreeModel';

describe('hookTreeModel', () => {
  it('builds explicit group-path tree using normalized labels', () => {
    const tree = buildHookTree([
      { index: 0, name: 'state', groupPath: ['auth', 'session'], state: 1 },
      { index: 1, name: 'memo', groupPath: ['auth', 'session'], state: 2 },
      { index: 2, name: 'effect', groupPath: ['auth', 'network'], state: 3 },
    ]);

    expect(tree).toEqual([
      {
        type: 'group',
        title: 'Auth',
        children: [
          {
            type: 'group',
            title: 'Session',
            children: [
              {
                type: 'item',
                item: expect.objectContaining({
                  order: 1,
                  name: 'State',
                  badge: null,
                }),
              },
              {
                type: 'item',
                item: expect.objectContaining({
                  order: 2,
                  name: 'Memo',
                  badge: 'function',
                }),
              },
            ],
          },
          {
            type: 'group',
            title: 'Network',
            children: [
              {
                type: 'item',
                item: expect.objectContaining({
                  order: 3,
                  name: 'Effect',
                  badge: 'effect',
                }),
              },
            ],
          },
        ],
      },
    ]);
  });

  it('falls back to inferred custom groups when explicit path is absent', () => {
    const tree = buildHookTree([
      { name: 'Auth' },
      { name: 'State', state: { ok: true } },
      { name: 'Memo', state: () => null },
      { name: 'Network' },
      { name: 'Effect', state: null },
    ]);

    expect(tree).toEqual([
      {
        type: 'group',
        title: 'Auth',
        children: [
          {
            type: 'item',
            item: expect.objectContaining({
              name: 'State',
              badge: null,
            }),
          },
          {
            type: 'item',
            item: expect.objectContaining({
              name: 'Memo',
              badge: 'function',
            }),
          },
        ],
      },
      {
        type: 'group',
        title: 'Network',
        children: [
          {
            type: 'item',
            item: expect.objectContaining({
              name: 'Effect',
              badge: 'effect',
            }),
          },
        ],
      },
    ]);
  });

  it('uses group as groupPath when groupPath is missing', () => {
    const tree = buildHookTree([{ name: 'State', group: ' profile ', state: 7 }]);

    expect(tree).toEqual([
      {
        type: 'group',
        title: 'Profile',
        children: [
          {
            type: 'item',
            item: expect.objectContaining({
              name: 'State',
              group: 'Profile',
              groupPath: ['Profile'],
            }),
          },
        ],
      },
    ]);
  });
});
