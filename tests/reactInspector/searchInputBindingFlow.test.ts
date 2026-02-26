import { describe, expect, it, vi } from 'vitest';
import type { ReactComponentInfo } from '../../src/shared/inspector';
import { createReactComponentSearchInputFlow } from '../../src/features/panel/reactInspector/search/searchInputBindingFlow';

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

describe('createReactComponentSearchInputFlow', () => {
  it('reads input value, updates query state and delegates to search input flow', () => {
    let componentSearchQuery = '';
    const applySearchNoResultState = vi.fn();
    const handleComponentSearchInput = vi.fn((options: any) => {
      options.applySearchNoResultState({ clearHoverPreview: true });
    });
    const reactComponents = [createComponent('a')];

    const onComponentSearchInput = createReactComponentSearchInputFlow(
      {
        getSearchInputValue: () => 'next-query',
        setComponentSearchQuery: (query) => {
          componentSearchQuery = query;
        },
        getComponentSearchQuery: () => componentSearchQuery,
        getReactComponents: () => reactComponents,
        getSelectedReactComponentIndex: () => 0,
        getComponentFilterResult: () => ({ visibleIndices: [0], matchedIndices: [0] }),
        applySearchNoResultState,
        expandAncestorPaths: vi.fn(),
        selectReactComponent: vi.fn(),
        renderReactComponentList: vi.fn(),
        setReactStatus: vi.fn(),
        buildSearchSummaryStatusText: vi.fn(() => 'summary'),
      },
      {
        handleComponentSearchInput,
      },
    );

    onComponentSearchInput();

    expect(componentSearchQuery).toBe('next-query');
    expect(handleComponentSearchInput).toHaveBeenCalledWith(
      expect.objectContaining({
        componentSearchQuery: 'next-query',
        reactComponents,
        selectedReactComponentIndex: 0,
      }),
    );
    expect(applySearchNoResultState).toHaveBeenCalledWith('searchInput', {
      clearHoverPreview: true,
    });
  });
});
