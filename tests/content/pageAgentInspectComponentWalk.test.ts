import { describe, expect, it, vi } from 'vitest';
import { walkInspectableComponents } from '../../src/content/pageAgentInspectComponentWalk';

describe('pageAgentInspectComponentWalk', () => {
  it('prefers closer dom target distance over deeper component depth', () => {
    const childFiber = { tag: 0, child: null, sibling: null };
    const parentFiber = { tag: 0, child: childFiber, sibling: null };
    const rootFiber = { tag: 3, child: parentFiber, sibling: null };

    const walked = walkInspectableComponents({
      rootFiber,
      targetEl: document.createElement('button'),
      includeSerializedData: false,
      selectedComponentId: null,
      maxTraversal: 20,
      maxComponents: 20,
      isInspectableTag: (tag: number) => tag === 0,
      getDomInfoForFiber(fiber) {
        if (fiber === parentFiber) {
          return {
            domSelector: '.parent',
            domPath: '/root/parent',
            domTagName: 'div',
            containsTarget: true,
            targetContainDistance: 1,
          };
        }
        if (fiber === childFiber) {
          return {
            domSelector: '.child',
            domPath: '/root/parent/child',
            domTagName: 'span',
            containsTarget: true,
            targetContainDistance: 3,
          };
        }
        return {
          domSelector: null,
          domPath: null,
          domTagName: null,
          containsTarget: false,
          targetContainDistance: null,
        };
      },
      getStableFiberId: vi.fn((fiber) => (fiber === parentFiber ? 'parent' : 'child')),
      fiberIdMap: new WeakMap<object, string>(),
      getHooksInfo: vi.fn(() => ({ value: null, count: 0 })),
      getHooksCount: vi.fn(() => 0),
      serializePropsForFiber: vi.fn(() => null),
      makeSerializer: vi.fn(() => (value: unknown) => value),
      getFiberName: vi.fn((fiber) => (fiber === parentFiber ? 'Parent' : 'Child')),
      getFiberKind: vi.fn(() => 'FunctionComponent'),
    });

    expect(walked.components).toHaveLength(2);
    expect(walked.targetMatchedIndex).toBe(0);
    expect(walked.components[0].id).toBe('parent');
    expect(walked.components[1].id).toBe('child');
  });
});
