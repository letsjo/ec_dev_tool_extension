import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  captureReactTreeScrollAnchor,
  restoreReactTreeScrollAnchor,
} from '../../src/features/panel/reactInspector/list/listTreeScrollAnchor';

function createRect(top: number): DOMRect {
  return {
    x: 0,
    y: top,
    width: 10,
    height: 10,
    top,
    right: 10,
    bottom: top + 10,
    left: 0,
    toJSON: () => ({}),
  } as DOMRect;
}

describe('listTreeScrollAnchor', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('restores scrollTop by selected-item offset delta when selected item remains', () => {
    const treePaneEl = document.createElement('div');
    const reactComponentListEl = document.createElement('div');
    treePaneEl.scrollTop = 50;
    treePaneEl.scrollLeft = 12;

    vi.spyOn(treePaneEl, 'getBoundingClientRect').mockReturnValue(createRect(100));

    const previousItem = document.createElement('button');
    previousItem.className = 'react-component-item';
    previousItem.dataset.componentIndex = '2';
    vi.spyOn(previousItem, 'getBoundingClientRect').mockReturnValue(createRect(160));
    reactComponentListEl.appendChild(previousItem);

    const anchor = captureReactTreeScrollAnchor({
      treePaneEl,
      reactComponentListEl,
      selectedReactComponentIndex: 2,
    });

    reactComponentListEl.replaceChildren();
    const nextItem = document.createElement('button');
    nextItem.className = 'react-component-item';
    nextItem.dataset.componentIndex = '2';
    vi.spyOn(nextItem, 'getBoundingClientRect').mockReturnValue(createRect(175));
    reactComponentListEl.appendChild(nextItem);

    restoreReactTreeScrollAnchor({
      treePaneEl,
      reactComponentListEl,
      anchor,
    });

    expect(treePaneEl.scrollTop).toBe(65);
    expect(treePaneEl.scrollLeft).toBe(12);
  });

  it('falls back to previous scrollTop when selected item disappears', () => {
    const treePaneEl = document.createElement('div');
    const reactComponentListEl = document.createElement('div');
    treePaneEl.scrollTop = 33;
    treePaneEl.scrollLeft = 7;

    vi.spyOn(treePaneEl, 'getBoundingClientRect').mockReturnValue(createRect(50));

    const previousItem = document.createElement('button');
    previousItem.className = 'react-component-item';
    previousItem.dataset.componentIndex = '1';
    vi.spyOn(previousItem, 'getBoundingClientRect').mockReturnValue(createRect(80));
    reactComponentListEl.appendChild(previousItem);

    const anchor = captureReactTreeScrollAnchor({
      treePaneEl,
      reactComponentListEl,
      selectedReactComponentIndex: 1,
    });

    treePaneEl.scrollTop = 999;
    reactComponentListEl.replaceChildren();

    restoreReactTreeScrollAnchor({
      treePaneEl,
      reactComponentListEl,
      anchor,
    });

    expect(treePaneEl.scrollTop).toBe(33);
    expect(treePaneEl.scrollLeft).toBe(7);
  });
});
