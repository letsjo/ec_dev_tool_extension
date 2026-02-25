import { describe, expect, it, vi } from 'vitest';
import { createPanelPaneSetters } from '../../src/features/panel/paneSetters';

describe('paneSetters', () => {
  it('applies output/react/dom text and error states', () => {
    const outputEl = document.createElement('div');
    const elementOutputEl = document.createElement('div');
    const reactStatusEl = document.createElement('div');
    const reactListEl = document.createElement('div');
    const reactDetailEl = document.createElement('div');
    const domTreeStatusEl = document.createElement('div');
    const domTreeOutputEl = document.createElement('div');

    const setLastReactListRenderSignature = vi.fn();
    const setLastReactDetailRenderSignature = vi.fn();
    const setLastReactDetailComponentId = vi.fn();
    const setters = createPanelPaneSetters({
      getOutputEl: () => outputEl,
      getElementOutputEl: () => elementOutputEl,
      getReactStatusEl: () => reactStatusEl,
      getReactComponentListEl: () => reactListEl,
      getReactComponentDetailEl: () => reactDetailEl,
      getDomTreeStatusEl: () => domTreeStatusEl,
      getDomTreeOutputEl: () => domTreeOutputEl,
      setLastReactListRenderSignature,
      setLastReactDetailRenderSignature,
      setLastReactDetailComponentId,
    });

    setters.setOutput('fetch failed', true);
    setters.setElementOutput('div#root');
    setters.setReactStatus('loaded', false);
    setters.setDomTreeStatus('DOM error', true);
    setters.setDomTreeEmpty('no dom');

    expect(outputEl.textContent).toBe('fetch failed');
    expect(outputEl.classList.contains('error')).toBe(true);
    expect(elementOutputEl.textContent).toBe('div#root');
    expect(reactStatusEl.textContent).toBe('loaded');
    expect(reactStatusEl.classList.contains('error')).toBe(false);
    expect(domTreeStatusEl.textContent).toBe('DOM error');
    expect(domTreeStatusEl.classList.contains('error')).toBe(true);
    expect(domTreeOutputEl.textContent).toBe('no dom');
  });

  it('stores empty signatures for react list/detail panes', () => {
    const reactListEl = document.createElement('div');
    const reactDetailEl = document.createElement('div');
    const setLastReactListRenderSignature = vi.fn();
    const setLastReactDetailRenderSignature = vi.fn();
    const setLastReactDetailComponentId = vi.fn();
    const setters = createPanelPaneSetters({
      getOutputEl: () => document.createElement('div'),
      getElementOutputEl: () => document.createElement('div'),
      getReactStatusEl: () => document.createElement('div'),
      getReactComponentListEl: () => reactListEl,
      getReactComponentDetailEl: () => reactDetailEl,
      getDomTreeStatusEl: () => document.createElement('div'),
      getDomTreeOutputEl: () => document.createElement('div'),
      setLastReactListRenderSignature,
      setLastReactDetailRenderSignature,
      setLastReactDetailComponentId,
    });

    setters.setReactListEmpty('empty list');
    setters.setReactDetailEmpty('empty detail');

    expect(setLastReactListRenderSignature).toHaveBeenCalledWith('__empty__:empty list');
    expect(setLastReactDetailRenderSignature).toHaveBeenCalledWith('__empty__:empty detail');
    expect(setLastReactDetailComponentId).toHaveBeenCalledWith(null);
    expect(reactListEl.classList.contains('empty')).toBe(true);
    expect(reactDetailEl.classList.contains('empty')).toBe(true);
  });
});
