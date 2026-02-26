import { describe, expect, it, vi } from 'vitest';
import type { ReactComponentInfo } from '../../src/shared/inspector';
import { createReactInspectorControllerState } from '../../src/features/panel/reactInspector/controllerState';
import { createReactInspectorControllerDerivations } from '../../src/features/panel/reactInspector/controllerDerivations';
import { createReactInspectorInteractionFlowWiring } from '../../src/features/panel/reactInspector/controllerFlowInteractionWiring';

function createComponent(id: string, name: string): ReactComponentInfo {
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

describe('createReactInspectorInteractionFlowWiring', () => {
  it('wires list/detail/search handlers and exposes queue reset handle', () => {
    const state = createReactInspectorControllerState();
    state.setReactComponents([createComponent('cmp-1', 'AlphaBox')]);

    const setReactStatus = vi.fn();
    const setReactListEmpty = vi.fn();
    const setReactDetailEmpty = vi.fn();
    const setDomTreeStatus = vi.fn();
    const setDomTreeEmpty = vi.fn();

    const componentSearchInputEl = document.createElement('input');
    componentSearchInputEl.value = 'alpha';
    const reactComponentListEl = document.createElement('div');
    const treePaneEl = document.createElement('div');
    const reactComponentDetailEl = document.createElement('div');

    const derivations = createReactInspectorControllerDerivations({
      state,
      inspectFunctionAtPath: vi.fn(),
      fetchSerializedValueAtPath: vi.fn(),
    });

    const wiring = createReactInspectorInteractionFlowWiring({
      options: {
        state,
        callInspectedPageAgent: vi.fn(),
        getReactComponentListEl: () => reactComponentListEl,
        getTreePaneEl: () => treePaneEl,
        getReactComponentDetailEl: () => reactComponentDetailEl,
        getComponentSearchInputEl: () => componentSearchInputEl,
        setReactStatus,
        setReactListEmpty,
        setReactDetailEmpty,
        clearPageHoverPreview: vi.fn(),
        clearPageComponentHighlight: vi.fn(),
        previewPageDomForComponent: vi.fn(),
        highlightPageDomForComponent: vi.fn(),
        setDomTreeStatus,
        setDomTreeEmpty,
        inspectFunctionAtPath: vi.fn(),
        fetchSerializedValueAtPath: vi.fn(),
        detailFetchRetryCooldownMs: 2500,
      },
      derivations,
    });

    expect(typeof wiring.onComponentSearchInput).toBe('function');
    expect(typeof wiring.renderReactComponentList).toBe('function');
    expect(typeof wiring.selectReactComponent).toBe('function');
    expect(typeof wiring.applySearchNoResultState).toBe('function');
    expect(typeof wiring.detailFetchQueue.reset).toBe('function');

    wiring.renderReactComponentList();
    wiring.onComponentSearchInput();
    wiring.applySearchNoResultState('searchInput');
    expect(setReactStatus).toHaveBeenCalled();
  });
});
