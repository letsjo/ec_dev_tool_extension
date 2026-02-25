import { describe, expect, it } from 'vitest';
import { renderPanelFatalErrorView } from '../../src/features/panel/lifecycle/fatalErrorView';

describe('renderPanelFatalErrorView', () => {
  it('clears existing body and renders bootstrap error message', () => {
    const doc = document.implementation.createHTMLDocument('test');
    doc.body.innerHTML = '<div id="existing">existing</div>';

    renderPanelFatalErrorView(new Error('boom'), doc);

    expect(doc.getElementById('existing')).toBeNull();
    expect(doc.body.children.length).toBe(1);
    expect(doc.body.textContent).toContain('EC Dev Tool panel 초기화 실패');
    expect(doc.body.textContent).toContain('boom');
  });

  it('stringifies non-error values', () => {
    const doc = document.implementation.createHTMLDocument('test');

    renderPanelFatalErrorView(404, doc);

    expect(doc.body.textContent).toContain('404');
  });
});
