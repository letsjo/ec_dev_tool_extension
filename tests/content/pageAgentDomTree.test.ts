import { describe, expect, it } from 'vitest';
import { createGetDomTreeHandler } from '../../src/content/dom/pageAgentDomTree';

describe('createGetDomTreeHandler', () => {
  it('handles unknown request payload safely', () => {
    const getDomTree = createGetDomTreeHandler({
      buildCssSelector: () => '',
      getElementPath: () => '',
      resolveTargetElement: () => null,
    });

    expect(getDomTree('invalid-payload')).toEqual({
      ok: false,
      error: '요소를 찾을 수 없습니다.',
      selector: '',
    });
  });

  it('returns error when target element is missing', () => {
    const getDomTree = createGetDomTreeHandler({
      buildCssSelector: () => '',
      getElementPath: () => '',
      resolveTargetElement: () => null,
    });

    const result = getDomTree({
      selector: '#missing',
    });

    expect(result).toEqual({
      ok: false,
      error: '요소를 찾을 수 없습니다.',
      selector: '#missing',
    });
  });

  it('serializes DOM tree for resolved element', () => {
    const root = document.createElement('div');
    root.id = 'root';
    const child = document.createElement('span');
    child.className = 'child';
    child.textContent = 'hello world';
    root.append(child);
    document.body.append(root);

    const getDomTree = createGetDomTreeHandler({
      buildCssSelector: (el) => (el instanceof Element ? `#${el.id}` : ''),
      getElementPath: (el) => (el instanceof Element ? el.tagName.toLowerCase() : ''),
      resolveTargetElement: (selector) => document.querySelector(selector),
    });

    const result = getDomTree({
      selector: '#root',
    });

    expect(result.ok).toBe(true);
    expect(result.selector).toBe('#root');
    expect(result.domPath).toBe('div');
    expect(result.root.tagName).toBe('div');
    expect(result.root.id).toBe('root');
    expect(result.root.childCount).toBe(1);
    expect(result.root.children[0].tagName).toBe('span');
    expect(result.root.children[0].textPreview).toBe('hello world');
  });

  it('resolves duplicate selector by domPath when pickPoint is absent', () => {
    const first = document.createElement('input');
    first.id = 'name';
    first.placeholder = '거래처';
    const second = document.createElement('input');
    second.id = 'name';
    second.placeholder = '프로젝트';
    document.body.append(first, second);

    const getDomTree = createGetDomTreeHandler({
      buildCssSelector: (el) => (el instanceof Element ? `#${(el as HTMLElement).id}` : ''),
      getElementPath: (el) =>
        el instanceof Element ? `path:${(el as HTMLInputElement).placeholder || ''}` : '',
      resolveTargetElement: (selector) => document.querySelector(selector),
    });

    const result = getDomTree({
      selector: '#name',
      domPath: 'path:프로젝트',
    });

    expect(result.ok).toBe(true);
    expect(result.root.id).toBe('name');
    expect(result.domPath).toBe('path:프로젝트');
  });
});
