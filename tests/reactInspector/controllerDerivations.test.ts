import { describe, expect, it, vi } from 'vitest';
import type { ReactComponentInfo } from '../../src/shared/inspector';
import type { ReactInspectorControllerState } from '../../src/features/panel/reactInspector/controllerState';
import { createReactInspectorControllerDerivations } from '../../src/features/panel/reactInspector/controllerDerivations';

function createComponent(
  id: string,
  name: string,
  depth = 0,
  parentId: string | null = null,
): ReactComponentInfo {
  return {
    id,
    parentId,
    name,
    kind: 'function',
    depth,
    props: {},
    hooks: [],
    hookCount: 0,
    domSelector: null,
    domPath: null,
    domTagName: null,
  };
}

function createStateStub(
  components: ReactComponentInfo[],
  collapsedComponentIds: Set<string>,
  componentSearchQuery: string,
): ReactInspectorControllerState {
  let componentSearchTexts: string[] = [];
  const setComponentSearchTexts = vi.fn((nextTexts: string[]) => {
    componentSearchTexts = nextTexts;
  });

  return {
    getReactComponents: () => components,
    setReactComponents: vi.fn(),
    getSelectedReactComponentIndex: () => 0,
    setSelectedReactComponentIndex: vi.fn(),
    getStoredLookup: vi.fn(),
    setStoredLookup: vi.fn(),
    getComponentSearchQuery: () => componentSearchQuery,
    setComponentSearchQuery: vi.fn(),
    getComponentSearchTexts: () => componentSearchTexts,
    setComponentSearchTexts,
    getComponentSearchIncludeDataTokens: () => true,
    setComponentSearchIncludeDataTokens: vi.fn(),
    getCollapsedComponentIds: () => collapsedComponentIds,
    setCollapsedComponentIds: vi.fn(),
    getLastReactListRenderSignature: vi.fn(),
    setLastReactListRenderSignature: vi.fn(),
    getLastReactDetailRenderSignature: vi.fn(),
    setLastReactDetailRenderSignature: vi.fn(),
    getLastReactDetailComponentId: vi.fn(),
    setLastReactDetailComponentId: vi.fn(),
    getUpdatedComponentIds: vi.fn(),
    setUpdatedComponentIds: vi.fn(),
    readDetailRenderState: vi.fn(),
    writeDetailRenderState: vi.fn(),
    readListRenderState: vi.fn(),
    writeListRenderState: vi.fn(),
    writeResetState: vi.fn(),
    readApplyResultState: vi.fn(),
    writeApplyResultState: vi.fn(),
  } as unknown as ReactInspectorControllerState;
}

describe('createReactInspectorControllerDerivations', () => {
  it('rebuilds search cache before computing component filter result', () => {
    const state = createStateStub([createComponent('cmp-1', 'AlphaBox')], new Set(), 'alpha');
    const derivations = createReactInspectorControllerDerivations({
      state,
      inspectFunctionAtPath: vi.fn(),
      fetchSerializedValueAtPath: vi.fn(),
    });

    const filterResult = derivations.getComponentFilterResult();

    expect(state.setComponentSearchTexts).toHaveBeenCalledTimes(1);
    expect(filterResult.visibleIndices).toEqual([0]);
    expect(filterResult.matchedIndices).toEqual([0]);
  });

  it('expands ancestor paths by removing ancestor ids from collapsed set', () => {
    const components = [
      createComponent('parent', 'Parent', 0, null),
      createComponent('child', 'Child', 1, 'parent'),
    ];
    const collapsedComponentIds = new Set<string>(['parent']);
    const state = createStateStub(components, collapsedComponentIds, '');
    const derivations = createReactInspectorControllerDerivations({
      state,
      inspectFunctionAtPath: vi.fn(),
      fetchSerializedValueAtPath: vi.fn(),
    });

    derivations.expandAncestorPaths([1]);

    expect(collapsedComponentIds.has('parent')).toBe(false);
  });

  it('creates json section nodes through inspector json renderer wiring', () => {
    const state = createStateStub([createComponent('cmp-1', 'AlphaBox')], new Set(), '');
    const derivations = createReactInspectorControllerDerivations({
      state,
      inspectFunctionAtPath: vi.fn(),
      fetchSerializedValueAtPath: vi.fn(),
    });

    const sectionEl = derivations.createJsonSection(
      'Props',
      { answer: 42 },
      createComponent('cmp-1', 'AlphaBox'),
      'props',
    );

    expect(sectionEl.classList.contains('json-section')).toBe(true);
    expect(sectionEl.querySelector('.json-section-title')?.textContent).toBe('Props');
  });
});
