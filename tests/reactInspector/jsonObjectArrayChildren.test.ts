import { describe, expect, it } from 'vitest';
import type { ReactComponentInfo } from '../../src/shared/inspector';
import { createObjectArrayChildrenNode } from '../../src/features/panel/reactInspector/jsonObjectArrayChildren';
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
    hookCount: 0,
    domSelector: null,
    domPath: null,
    domTagName: null,
  };

  return {
    component,
    section: 'props',
    path: ['root'],
    refMap: new Map(),
    refStack: [],
    allowInspect: true,
  };
}

function createDetailsNode(label: string): HTMLDetailsElement {
  const details = document.createElement('details');
  const summary = document.createElement('summary');
  summary.textContent = label;
  details.appendChild(summary);
  return details;
}

describe('createObjectArrayChildrenNode', () => {
  it('renders non-object value as a single row with allowInspect disabled', () => {
    const seenAllowInspect: boolean[] = [];
    const children = createObjectArrayChildrenNode({
      sourceValue: 42,
      depth: 0,
      context: createTestContext(),
      createJsonValueNode: (_value, _depth, context) => {
        seenAllowInspect.push(context.allowInspect);
        const span = document.createElement('span');
        span.textContent = 'value';
        return span;
      },
    });

    expect(children.querySelectorAll('.json-row').length).toBe(1);
    expect(seenAllowInspect).toEqual([false]);
  });

  it('filters internal keys and renders expandable rows for details children', () => {
    const seenPaths: Array<Array<string | number>> = [];
    const children = createObjectArrayChildrenNode({
      sourceValue: {
        foo: 1,
        __ecRefId: 'internal',
        bar: { nested: true },
      },
      depth: 1,
      context: createTestContext(),
      createJsonValueNode: (value, _depth, context) => {
        seenPaths.push([...context.path]);
        if (typeof value === 'object' && value !== null) {
          return createDetailsNode('details');
        }
        const span = document.createElement('span');
        span.textContent = String(value);
        return span;
      },
    });

    expect(children.textContent).toContain('foo');
    expect(children.textContent).toContain('bar');
    expect(children.textContent).not.toContain('__ecRefId');
    expect(children.querySelector('.json-row-expandable')).toBeTruthy();
    expect(seenPaths).toEqual([
      ['root', 'foo'],
      ['root', 'bar'],
    ]);
  });
});
