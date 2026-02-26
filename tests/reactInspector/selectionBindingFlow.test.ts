import { describe, expect, it, vi } from 'vitest';
import type { ReactComponentInfo } from '../../src/shared/inspector';
import { createReactComponentSelectionBindingFlow } from '../../src/features/panel/reactInspector/selectionBindingFlow';

function createComponent(id: string): ReactComponentInfo {
  return {
    id,
    parentId: null,
    name: id,
    kind: 'function',
    depth: 0,
    props: {},
    hooks: [],
    hookCount: 0,
    domSelector: null,
    domPath: null,
    domTagName: null,
  };
}

describe('createReactComponentSelectionBindingFlow', () => {
  it('wires schedule callback to scroll selected component item into view', () => {
    const listEl = document.createElement('div');
    const item = document.createElement('button');
    item.className = 'react-component-item';
    item.dataset.componentIndex = '1';
    const scrollIntoView = vi.fn();
    item.scrollIntoView = scrollIntoView;
    listEl.append(item);

    let selectedReactComponentIndex = 1;
    let capturedSelectorOptions: any = null;
    const createReactComponentSelector = vi.fn((selectorOptions: any) => {
      capturedSelectorOptions = selectorOptions;
      return vi.fn();
    });
    const requestAnimationFrameFn = vi.fn((cb: FrameRequestCallback) => {
      cb(0);
      return 1;
    });

    createReactComponentSelectionBindingFlow(
      {
        getReactComponents: () => [createComponent('a')],
        setSelectedComponentIndex: vi.fn(),
        clearPageHoverPreview: vi.fn(),
        expandAncestorPaths: vi.fn(),
        renderReactComponentList: vi.fn(),
        getReactComponentListEl: () => listEl,
        getSelectedReactComponentIndex: () => selectedReactComponentIndex,
        renderReactComponentDetail: vi.fn(),
        setReactDetailEmpty: vi.fn(),
        highlightPageDomForComponent: vi.fn(),
        detailFetchQueue: {
          request: vi.fn(),
          getLastFailedAt: vi.fn(),
        },
        detailFetchRetryCooldownMs: 2500,
      },
      {
        requestAnimationFrameFn,
        createReactComponentSelector,
      },
    );

    capturedSelectorOptions.scheduleScrollSelectedComponentIntoView();
    expect(requestAnimationFrameFn).toHaveBeenCalledTimes(1);
    expect(scrollIntoView).toHaveBeenCalledWith({
      block: 'nearest',
      inline: 'nearest',
    });

    selectedReactComponentIndex = -1;
    capturedSelectorOptions.scheduleScrollSelectedComponentIntoView();
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
  });
});
