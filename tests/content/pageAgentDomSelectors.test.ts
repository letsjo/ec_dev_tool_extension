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

  it('builds scoped selector when id is duplicated', () => {
    const firstRow = document.createElement('div');
    firstRow.id = 'row-1';
    const firstInput = document.createElement('input');
    firstInput.id = 'name';
    firstRow.appendChild(firstInput);

    const secondRow = document.createElement('div');
    secondRow.id = 'row-2';
    const secondInput = document.createElement('input');
    secondInput.id = 'name';
    secondRow.appendChild(secondInput);

    document.body.append(firstRow, secondRow);

    const selector = buildCssSelector(secondInput);
    expect(selector).not.toBe('#name');
    expect(document.querySelector(selector)).toBe(secondInput);
    expect(document.querySelectorAll(selector)).toHaveLength(1);

    firstRow.remove();
    secondRow.remove();
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
