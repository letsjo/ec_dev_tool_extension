import { describe, expect, it } from 'vitest';
import type { ReactComponentInfo } from '../../src/shared/inspector';
import { appendHookTreeNodes } from '../../src/features/panel/reactInspector/jsonHookTreeRenderer';
import type { HookTreeNode } from '../../src/features/panel/reactInspector/hookTreeModel';
import type { JsonRenderContext } from '../../src/features/panel/reactInspector/jsonRenderTypes';

function createTestContext(): JsonRenderContext {
  const component: ReactComponentInfo = {
    id: 'component-1',
    parentId: null,
    name: 'TestComponent',
    kind: 'function',
    depth: 0,
    props: {},
    hooks: [],
    hookCount: 2,
    domSelector: null,
    domPath: null,
    domTagName: null,
  };

  return {
    component,
    section: 'hooks',
    path: [],
    refMap: new Map(),
    refStack: [],
    allowInspect: true,
  };
}

function createDetailsValueNode(text: string): HTMLDetailsElement {
  const details = document.createElement('details');
  const summary = document.createElement('summary');
  summary.textContent = text;
  details.appendChild(summary);
  const children = document.createElement('div');
  children.className = 'json-children';
  details.appendChild(children);
  return details;
}

describe('jsonHookTreeRenderer', () => {
  it('renders expandable hook rows when the value node is details', () => {
    const container = document.createElement('div');
    const nodes: HookTreeNode[] = [
      {
        type: 'item',
        item: {
          sourceIndex: 0,
          order: 1,
          name: 'Effect',
          group: null,
          groupPath: null,
          badge: 'effect',
          state: { ready: true },
        },
      },
    ];

    appendHookTreeNodes({
      container,
      nodes,
      context: createTestContext(),
      createJsonValueNode: () => createDetailsValueNode('state'),
    });

    expect(container.querySelector('.json-row-expandable.json-hook-row')).toBeTruthy();
    expect(container.textContent).toContain('effect');
    expect(container.querySelector('.json-hook-state-node')).toBeTruthy();
  });

  it('renders grouped tree recursively and forwards hook state paths', () => {
    const container = document.createElement('div');
    const seenPaths: Array<Array<string | number>> = [];
    const seenDepths: number[] = [];
    const nodes: HookTreeNode[] = [
      {
        type: 'group',
        title: 'Auth',
        children: [
          {
            type: 'item',
            item: {
              sourceIndex: 3,
              order: 4,
              name: 'State',
              group: 'Auth',
              groupPath: ['Auth'],
              badge: null,
              state: 42,
            },
          },
          {
            type: 'group',
            title: 'Inner',
            children: [
              {
                type: 'item',
                item: {
                  sourceIndex: 5,
                  order: 6,
                  name: 'Memo',
                  group: 'Inner',
                  groupPath: ['Auth', 'Inner'],
                  badge: 'function',
                  state: 'ok',
                },
              },
            ],
          },
        ],
      },
    ];

    appendHookTreeNodes({
      container,
      nodes,
      context: createTestContext(),
      createJsonValueNode: (_value, depth, context) => {
        seenDepths.push(depth);
        seenPaths.push([...context.path]);
        const span = document.createElement('span');
        span.textContent = 'value';
        return span;
      },
    });

    expect(container.querySelectorAll('.json-hook-group').length).toBe(2);
    expect(container.textContent).toContain('Auth');
    expect(container.textContent).toContain('Inner');
    expect(seenDepths).toEqual([1, 1]);
    expect(seenPaths).toEqual([
      [3, 'state'],
      [5, 'state'],
    ]);
  });
});
