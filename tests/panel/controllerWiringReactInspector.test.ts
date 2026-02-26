import { describe, expect, it, vi } from 'vitest';
import type { ReactComponentInfo } from '../../src/shared/inspector';
import { createReactInspectorControllerState } from '../../src/features/panel/reactInspector/controllerState';
import { createControllerWiringReactInspector } from '../../src/features/panel/controller/wiring/controllerWiringReactInspector';

describe('createControllerWiringReactInspector', () => {
  it('wires path bindings output into controller flows', () => {
    const state = createReactInspectorControllerState();
    const callInspectedPageAgent = vi.fn();
    const setReactStatus = vi.fn();

    const inspectFunctionAtPath = vi.fn();
    const fetchSerializedValueAtPath = vi.fn();
    const onComponentSearchInput = vi.fn();
    const fetchReactInfo = vi.fn();
    const createReactInspectPathBindings = vi.fn(() => ({
      inspectFunctionAtPath,
      fetchSerializedValueAtPath,
    }));
    const createReactInspectorControllerFlows = vi.fn(() => ({
      onComponentSearchInput,
      fetchReactInfo,
    }));

    const reactComponentListEl = document.createElement('div');
    const treePaneEl = document.createElement('div');
    const reactComponentDetailEl = document.createElement('div');
    const componentSearchInputEl = document.createElement('input');

    const result = createControllerWiringReactInspector(
      {
        state,
        callInspectedPageAgent,
        getReactComponentListEl: () => reactComponentListEl,
        getTreePaneEl: () => treePaneEl,
        getReactComponentDetailEl: () => reactComponentDetailEl,
        getComponentSearchInputEl: () => componentSearchInputEl,
        setReactStatus,
        setReactListEmpty: vi.fn(),
        setReactDetailEmpty: vi.fn(),
        clearPageHoverPreview: vi.fn(),
        clearPageComponentHighlight: vi.fn(),
        previewPageDomForComponent: vi.fn((_: ReactComponentInfo) => {}),
        highlightPageDomForComponent: vi.fn((_: ReactComponentInfo) => {}),
        setDomTreeStatus: vi.fn(),
        setDomTreeEmpty: vi.fn(),
        detailFetchRetryCooldownMs: 2500,
      },
      {
        createReactInspectPathBindings,
        createReactInspectorControllerFlows,
      },
    );

    expect(createReactInspectPathBindings).toHaveBeenCalledWith({
      callInspectedPageAgent,
      getStoredLookup: state.getStoredLookup,
      setReactStatus,
    });
    expect(createReactInspectorControllerFlows).toHaveBeenCalledWith(
      expect.objectContaining({
        state,
        callInspectedPageAgent,
        inspectFunctionAtPath,
        fetchSerializedValueAtPath,
      }),
    );
    expect(result).toEqual({
      onComponentSearchInput,
      fetchReactInfo,
    });
  });
});
