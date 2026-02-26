import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createDomHighlightHandlers } from '../../src/content/dom/pageAgentDomHighlight';

const COMPONENT_KEY = '__TEST_COMPONENT_HIGHLIGHT__';
const HOVER_KEY = '__TEST_HOVER_PREVIEW__';

function getWindowStore() {
  return window as unknown as Record<string, any>;
}

describe('createDomHighlightHandlers', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    getWindowStore()[COMPONENT_KEY] = null;
    getWindowStore()[HOVER_KEY] = null;
  });

  it('highlights component element and restores previous styles on clear', () => {
    const target = document.createElement('div');
    target.id = 'target';
    target.style.outline = '1px solid red';
    target.style.boxShadow = 'none';
    target.style.transition = 'opacity 80ms ease';

    const scrollIntoView = vi.fn();
    Object.defineProperty(target, 'scrollIntoView', {
      value: scrollIntoView,
      configurable: true,
    });
    vi.spyOn(target, 'getBoundingClientRect').mockReturnValue(new DOMRect(10, 20, 100, 40));

    document.body.append(target);

    const handlers = createDomHighlightHandlers({
      componentHighlightStorageKey: COMPONENT_KEY,
      hoverPreviewStorageKey: HOVER_KEY,
      buildCssSelector: (el) => (el instanceof Element ? `#${el.id}` : ''),
      getElementPath: () => 'html > body > div#target',
    });

    const highlightResult = handlers.highlightComponent({
      selector: '#target',
    });

    expect(highlightResult).toEqual({
      ok: true,
      tagName: 'div',
      selector: '#target',
      domPath: 'html > body > div#target',
      rect: {
        top: 20,
        left: 10,
        width: 100,
        height: 40,
      },
    });
    expect(target.style.outline).toContain('2px');
    expect(target.style.outline).not.toBe('1px solid red');
    expect(target.style.boxShadow).toContain('rgba(');
    expect(target.style.boxShadow).toContain('0.25');
    expect(target.style.transition).toContain('outline-color 120ms ease');
    expect(scrollIntoView).toHaveBeenCalledTimes(1);

    const clearResult = handlers.clearComponentHighlight();
    expect(clearResult).toEqual({ ok: true });
    expect(target.style.outline).toBe('1px solid red');
    expect(target.style.boxShadow).toBe('none');
    expect(target.style.transition).toBe('opacity 80ms ease');
    expect(getWindowStore()[COMPONENT_KEY]).toBeNull();
  });

  it('previews element and restores style on clear hover preview', () => {
    const target = document.createElement('section');
    target.id = 'preview-target';
    target.style.outline = '1px dotted black';
    target.style.boxShadow = 'inset 0 0 0 1px rgba(0, 0, 0, 0.2)';
    document.body.append(target);

    const handlers = createDomHighlightHandlers({
      componentHighlightStorageKey: COMPONENT_KEY,
      hoverPreviewStorageKey: HOVER_KEY,
      buildCssSelector: () => '#preview-target',
      getElementPath: () => 'html > body > section#preview-target',
    });

    const previewResult = handlers.previewComponent({
      selector: '#preview-target',
    });

    expect(previewResult).toEqual({ ok: true });
    expect(target.style.outline).toContain('2px');
    expect(target.style.outline).not.toBe('1px dotted black');
    expect(target.style.boxShadow).toContain('rgba(');
    expect(target.style.boxShadow).toContain('0.3');

    const clearResult = handlers.clearHoverPreview();
    expect(clearResult).toEqual({ ok: true });
    expect(target.style.outline).toBe('1px dotted black');
    expect(target.style.boxShadow).toBe('inset 0 0 0 1px rgba(0, 0, 0, 0.2)');
    expect(getWindowStore()[HOVER_KEY]).toBeNull();
  });

  it('returns error and clears stored state when selector is missing', () => {
    const handlers = createDomHighlightHandlers({
      componentHighlightStorageKey: COMPONENT_KEY,
      hoverPreviewStorageKey: HOVER_KEY,
      buildCssSelector: () => '',
      getElementPath: () => '',
    });

    const result = handlers.highlightComponent({
      selector: '#missing',
    });

    expect(result).toEqual({
      ok: false,
      error: '요소를 찾을 수 없습니다.',
      selector: '#missing',
    });
    expect(getWindowStore()[COMPONENT_KEY]).toBeNull();
  });

  it('resolves duplicate selector by domPath when highlighting component', () => {
    const first = document.createElement('input');
    first.id = 'name';
    first.placeholder = '거래처';
    const second = document.createElement('input');
    second.id = 'name';
    second.placeholder = '프로젝트';
    const wrapper = document.createElement('div');
    wrapper.id = 'wrapper';
    wrapper.append(first, second);
    document.body.append(wrapper);

    const handlers = createDomHighlightHandlers({
      componentHighlightStorageKey: COMPONENT_KEY,
      hoverPreviewStorageKey: HOVER_KEY,
      buildCssSelector: () => '#name',
      getElementPath: (el) => {
        if (!(el instanceof Element)) return '';
        return `path:${(el as HTMLInputElement).placeholder || ''}`;
      },
    });

    const result = handlers.highlightComponent({
      selector: '#name',
      domPath: 'path:프로젝트',
    });

    expect(result.ok).toBe(true);
    expect(first.style.outline).toBe('');
    expect(second.style.outline).toContain('2px');
  });
});
