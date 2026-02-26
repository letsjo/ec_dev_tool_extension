import { describe, expect, it } from 'vitest';
import {
  buildCssSelector,
  getElementPath,
  resolveTargetElement,
} from '../../src/content/dom/pageAgentDomSelectors';

describe('pageAgentDomSelectors', () => {
  it('builds readable element path with id/class segments', () => {
    const root = document.createElement('div');
    root.id = 'root';
    const child = document.createElement('span');
    child.className = 'first second third';
    root.appendChild(child);
    document.body.appendChild(root);

    expect(getElementPath(child)).toContain('div#root > span.first.second');

    root.remove();
  });

  it('builds css selector with nth-of-type when siblings share same tag', () => {
    const wrapper = document.createElement('div');
    const list = document.createElement('ul');
    const first = document.createElement('li');
    const second = document.createElement('li');
    list.appendChild(first);
    list.appendChild(second);
    wrapper.appendChild(list);
    document.body.appendChild(wrapper);

    const selector = buildCssSelector(second);
    expect(selector).toContain('li:nth-of-type(2)');

    wrapper.remove();
  });

  it('resolves element by selector and handles invalid selectors safely', () => {
    const target = document.createElement('section');
    target.id = 'selector-target';
    document.body.appendChild(target);

    expect(resolveTargetElement('#selector-target', null)).toBe(target);
    expect(resolveTargetElement('##invalid-selector', null)).toBeNull();

    target.remove();
  });
});
