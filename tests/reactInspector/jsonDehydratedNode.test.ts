import { describe, expect, it, vi } from 'vitest';
import { createDehydratedTokenNode } from '../../src/features/panel/reactInspector/jsonDehydratedNode';

type AnyRecord = Record<string, any>;

function createContext(overrides: Partial<AnyRecord> = {}) {
  return {
    component: {
      id: 'cmp-1',
      parentId: null,
      name: 'Comp',
      kind: 'function',
      depth: 0,
      hooksCount: 0,
      domSelector: null,
      domPath: null,
      containsTarget: false,
      key: null,
      props: null,
      hooks: null,
    },
    section: 'props',
    path: ['payload'],
    allowInspect: true,
    ...overrides,
  };
}

describe('jsonDehydratedNode', () => {
  it('renders primitive fallback when runtime inspect is disabled', () => {
    const node = createDehydratedTokenNode({
      value: {
        __ecType: 'dehydrated',
        valueType: 'object',
        preview: 'Object(3)',
        reason: 'depth',
      },
      depth: 1,
      context: createContext({ allowInspect: false }),
      fetchSerializedValueAtPath: vi.fn(),
      createReplacementJsonValueNode: vi.fn(() => document.createElement('span')),
    });

    expect(node).toBeInstanceOf(HTMLSpanElement);
    expect((node as HTMLSpanElement).textContent).toContain('Object(3)');
  });

  it('fetches serialized value once on expand and replaces details node', () => {
    const fetchSerializedValueAtPath = vi.fn((_, __, ___, onDone) => {
      onDone({ foo: 1 });
    });
    const replacement = document.createElement('details');
    const createReplacementJsonValueNode = vi.fn(() => replacement);

    const node = createDehydratedTokenNode({
      value: {
        __ecType: 'dehydrated',
        valueType: 'object',
        preview: 'Object(1)',
        reason: 'depth',
      },
      depth: 0,
      context: createContext(),
      fetchSerializedValueAtPath,
      createReplacementJsonValueNode,
    });

    expect(node).toBeInstanceOf(HTMLDetailsElement);
    const details = node as HTMLDetailsElement;
    document.body.appendChild(details);

    details.open = true;
    details.dispatchEvent(new Event('toggle'));
    details.dispatchEvent(new Event('toggle'));

    expect(fetchSerializedValueAtPath).toHaveBeenCalledTimes(1);
    expect(createReplacementJsonValueNode).toHaveBeenCalledTimes(1);
    expect(replacement.open).toBe(true);
  });
});
