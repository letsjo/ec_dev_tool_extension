import { describe, expect, it } from 'vitest';
import { resolveInspectComponentsSelectionResult } from '../../src/content/inspect/components/pageAgentInspectComponentsResult';

describe('pageAgentInspectComponentsResult', () => {
  it('computes selected index and source summary from walked components', () => {
    const fiber = {
      tag: 0,
      stateNode: document.createElement('section'),
    };
    const sourceElement = document.createElement('article');
    const idByFiber = new Map<object, string>();
    idByFiber.set(fiber, 'cmp-1');

    const result = resolveInspectComponentsSelectionResult({
      components: [
        {
          id: 'cmp-1',
          parentId: null,
          name: 'App',
          kind: 'FunctionComponent',
          depth: 0,
          props: {},
          hooks: [],
          hookCount: 0,
          hasSerializedData: true,
          domSelector: 'section',
          domPath: '/html/body/section',
          domTagName: 'section',
        },
      ],
      idByFiber,
      targetMatchedIndex: -1,
      nearest: {
        fiber,
        sourceElement,
      },
      targetEl: null,
      hostCache: new Map<object, Element | null>(),
      visiting: new Set<object>(),
      findPreferredSelectedFiber: () => fiber,
      buildCssSelector: () => 'article',
      getElementPath: () => '/html/body/article',
    });

    expect(result.selectedIndex).toBe(0);
    expect(result.sourceElement).toEqual({
      selector: 'article',
      domPath: '/html/body/article',
      tagName: 'article',
    });
  });
});
