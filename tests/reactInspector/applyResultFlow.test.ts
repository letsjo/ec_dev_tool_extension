import { describe, expect, it, vi } from 'vitest';
import type {
  ReactComponentInfo,
  ReactInspectResult,
} from '../../src/shared/inspector/types';
import { createReactInspectResultApplyFlow } from '../../src/features/panel/reactInspector/applyResultFlow';

interface MutableInspectState {
  reactComponents: ReactComponentInfo[];
  selectedReactComponentIndex: number;
  collapsedComponentIds: Set<string>;
  componentSearchIncludeDataTokens: boolean;
  componentSearchTexts: string[];
  updatedComponentIds: Set<string>;
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
  state?: Partial<MutableInspectState>;
  filterResult?: { visibleIndices: number[]; matchedIndices: number[] };
}) {
  const state: MutableInspectState = {
    reactComponents: options.state?.reactComponents ?? [createComponent('a')],
    selectedReactComponentIndex: options.state?.selectedReactComponentIndex ?? -1,
    collapsedComponentIds: options.state?.collapsedComponentIds ?? new Set<string>(),
    componentSearchIncludeDataTokens:
      options.state?.componentSearchIncludeDataTokens ?? true,
    componentSearchTexts: options.state?.componentSearchTexts ?? [],
    updatedComponentIds: options.state?.updatedComponentIds ?? new Set<string>(),
  };

  const setReactStatus = vi.fn();
  const renderReactComponentList = vi.fn();
  const selectReactComponent = vi.fn();
  const applySearchNoResultState = vi.fn();
  const resetReactInspector = vi.fn();

  const applyReactInspectResult = createReactInspectResultApplyFlow({
    readState: () => ({
      reactComponents: state.reactComponents,
      selectedReactComponentIndex: state.selectedReactComponentIndex,
      collapsedComponentIds: state.collapsedComponentIds,
    }),
    writeState: (update) => {
      if ('reactComponents' in update && update.reactComponents) {
        state.reactComponents = update.reactComponents;
      }
      if (
        'selectedReactComponentIndex' in update &&
        typeof update.selectedReactComponentIndex === 'number'
      ) {
        state.selectedReactComponentIndex = update.selectedReactComponentIndex;
      }
      if ('collapsedComponentIds' in update && update.collapsedComponentIds) {
        state.collapsedComponentIds = update.collapsedComponentIds;
      }
      if (
        'componentSearchIncludeDataTokens' in update &&
        typeof update.componentSearchIncludeDataTokens === 'boolean'
      ) {
        state.componentSearchIncludeDataTokens = update.componentSearchIncludeDataTokens;
      }
      if ('componentSearchTexts' in update && update.componentSearchTexts) {
        state.componentSearchTexts = update.componentSearchTexts;
      }
      if ('updatedComponentIds' in update && update.updatedComponentIds) {
        state.updatedComponentIds = update.updatedComponentIds;
      }
    },
    getComponentFilterResult: () =>
      options.filterResult ?? { visibleIndices: [0], matchedIndices: [0] },
    setReactStatus,
    renderReactComponentList,
    selectReactComponent,
    applySearchNoResultState,
    resetReactInspector,
  });

  return {
    state,
    setReactStatus,
    renderReactComponentList,
    selectReactComponent,
    applySearchNoResultState,
    resetReactInspector,
    applyReactInspectResult,
  };
}

describe('createReactInspectResultApplyFlow', () => {
  it('resets inspector when react inspect result has no components', () => {
    const harness = createHarness({
      state: {
        reactComponents: [createComponent('a')],
      },
    });

    const result: ReactInspectResult = { components: [] };
    harness.applyReactInspectResult(result);

    expect(harness.resetReactInspector).toHaveBeenCalledWith(
      'React 컴포넌트를 찾지 못했습니다.',
      true,
    );
    expect(harness.selectReactComponent).not.toHaveBeenCalled();
  });

  it('applies no-result state when filter has no visible items', () => {
    const harness = createHarness({
      filterResult: { visibleIndices: [], matchedIndices: [] },
    });
    const result: ReactInspectResult = { components: [createComponent('a')] };

    harness.applyReactInspectResult(result);

    expect(harness.state.selectedReactComponentIndex).toBe(-1);
    expect(harness.applySearchNoResultState).toHaveBeenCalledWith('inspectResult');
    expect(harness.selectReactComponent).not.toHaveBeenCalled();
  });

  it('renders list only when refreshDetail is disabled and selection did not change', () => {
    const harness = createHarness({
      state: {
        reactComponents: [createComponent('a')],
        selectedReactComponentIndex: 0,
      },
      filterResult: { visibleIndices: [0], matchedIndices: [0] },
    });
    const result: ReactInspectResult = { components: [createComponent('a')] };

    harness.applyReactInspectResult(result, {
      preserveSelection: true,
      refreshDetail: false,
    });

    expect(harness.renderReactComponentList).toHaveBeenCalledTimes(1);
    expect(harness.selectReactComponent).not.toHaveBeenCalled();
  });

  it('selects component with default highlight/scroll/expand options', () => {
    const harness = createHarness({});
    const result: ReactInspectResult = {
      components: [createComponent('a')],
      selectedIndex: 0,
    };

    harness.applyReactInspectResult(result);

    expect(harness.setReactStatus).toHaveBeenCalledTimes(1);
    expect(harness.selectReactComponent).toHaveBeenCalledWith(0, {
      highlightDom: true,
      scrollIntoView: true,
      expandAncestors: true,
    });
  });
});
