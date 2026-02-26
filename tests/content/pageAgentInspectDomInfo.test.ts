import { describe, expect, it } from 'vitest';
import { getDomInfoForFiber } from '../../src/content/pageAgentInspectDomInfo';

describe('pageAgentInspectDomInfo', () => {
  it('computes target contain distance for exact and ancestor host matches', () => {
    const container = document.createElement('section');
    const child = document.createElement('button');
    container.append(child);

    const hostFiber = {
      tag: 5,
      stateNode: container,
      child: null,
      sibling: null,
    };
    const exactFiber = {
      tag: 5,
      stateNode: child,
      child: null,
      sibling: null,
    };

    const commonArgs = {
      hostCache: new Map<object, Element | null>(),
      visiting: new Set<object>(),
      buildCssSelector: (el: Element | null) => (el ? el.tagName.toLowerCase() : ''),
      getElementPath: (el: Element | null) => (el ? el.tagName.toLowerCase() : ''),
    };

    const ancestorMatch = getDomInfoForFiber({
      ...commonArgs,
      fiber: hostFiber,
      selectedEl: child,
    });
    expect(ancestorMatch.containsTarget).toBe(true);
    expect(ancestorMatch.targetContainDistance).toBe(1);

    const exactMatch = getDomInfoForFiber({
      ...commonArgs,
      fiber: exactFiber,
      selectedEl: child,
    });
    expect(exactMatch.containsTarget).toBe(true);
    expect(exactMatch.targetContainDistance).toBe(0);
  });
});
