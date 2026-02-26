import { describe, expect, it, vi } from 'vitest';
import type {
  ComponentFilterResult,
  ReactComponentInfo,
} from '../../src/shared/inspector';
import { createReactComponentListRenderFlow } from '../../src/features/panel/reactInspector/list/listRenderFlow';

interface MutableListRenderState {
  reactComponents: ReactComponentInfo[];
  componentSearchQuery: string;
  selectedReactComponentIndex: number;
  collapsedComponentIds: Set<string>;
  updatedComponentIds: Set<string>;
  lastReactListRenderSignature: string;
}

function createComponent(id: string, name = 'Component'): ReactComponentInfo {
  return {
    id,
    parentId: null,
    name,
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

function createHarness(options: {
  state?: Partial<MutableListRenderState>;
  filterResult?: ComponentFilterResult;
}) {
  const state: MutableListRenderState = {
    reactComponents: options.state?.reactComponents ?? [createComponent('a')],
    componentSearchQuery: options.state?.componentSearchQuery ?? '',
    selectedReactComponentIndex: options.state?.selectedReactComponentIndex ?? 0,
    collapsedComponentIds: options.state?.collapsedComponentIds ?? new Set<string>(),
    updatedComponentIds: options.state?.updatedComponentIds ?? new Set<string>(),
    lastReactListRenderSignature: options.state?.lastReactListRenderSignature ?? '',
  };

  const setReactListEmpty = vi.fn();
  const renderReactComponentListTree = vi.fn();

  const renderReactComponentList = createReactComponentListRenderFlow({
    readState: () => ({
      reactComponents: state.reactComponents,
      componentSearchQuery: state.componentSearchQuery,
      selectedReactComponentIndex: state.selectedReactComponentIndex,
      collapsedComponentIds: state.collapsedComponentIds,
      updatedComponentIds: state.updatedComponentIds,
      lastReactListRenderSignature: state.lastReactListRenderSignature,
    }),
    writeState: (update) => {
      if (update.updatedComponentIds) {
        state.updatedComponentIds = update.updatedComponentIds;
      }
      if (typeof update.lastReactListRenderSignature === 'string') {
        state.lastReactListRenderSignature = update.lastReactListRenderSignature;
      }
    },
    setReactListEmpty,
    buildReactComponentListEmptyText: (totalCount, query) =>
      `empty:${totalCount}:${query}`,
    getComponentFilterResult: () =>
      options.filterResult ?? { visibleIndices: [0], matchedIndices: [0] },
    buildReactListRenderSignature: () => 'signature-1',
    buildComponentIndexById: () => new Map([['a', 0]]),
    renderReactComponentListTree,
    getTreePaneEl: () => document.createElement('div'),
    getReactComponentListEl: () => document.createElement('div'),
    clearPaneContent: vi.fn(),
    previewPageDomForComponent: vi.fn(),
    clearPageHoverPreview: vi.fn(),
    getOnSelectComponent: () => vi.fn(),
  });

  return {
    state,
    setReactListEmpty,
    renderReactComponentListTree,
    renderReactComponentList,
  };
}

describe('createReactComponentListRenderFlow', () => {
  it('renders empty state when there are no components', () => {
    const harness = createHarness({
      state: { reactComponents: [], componentSearchQuery: 'abc' },
    });

    harness.renderReactComponentList();

    expect(harness.setReactListEmpty).toHaveBeenCalledWith('empty:0:abc');
    expect(harness.renderReactComponentListTree).not.toHaveBeenCalled();
  });

  it('renders empty state when filtered visible indices are empty', () => {
    const harness = createHarness({
      filterResult: { visibleIndices: [], matchedIndices: [] },
    });

    harness.renderReactComponentList();

    expect(harness.setReactListEmpty).toHaveBeenCalledWith('empty:1:');
    expect(harness.renderReactComponentListTree).not.toHaveBeenCalled();
  });

  it('skips rerender when signature is unchanged and no updates exist', () => {
    const harness = createHarness({
      state: {
        lastReactListRenderSignature: 'signature-1',
      },
    });

    harness.renderReactComponentList();

    expect(harness.renderReactComponentListTree).not.toHaveBeenCalled();
  });

  it('forces rerender when updated component ids exist', () => {
    const harness = createHarness({
      state: {
        lastReactListRenderSignature: 'signature-1',
        updatedComponentIds: new Set(['a']),
      },
    });

    harness.renderReactComponentList();

    expect(harness.renderReactComponentListTree).toHaveBeenCalledTimes(1);
    expect(harness.state.lastReactListRenderSignature).toBe('signature-1');
    expect(harness.state.updatedComponentIds.size).toBe(0);
  });
});
