import { describe, expect, it, vi } from 'vitest';
import type { PanelControllerContext } from '../../src/features/panel/controller/context';
import type { ReactInspectorControllerState } from '../../src/features/panel/reactInspector/controllerState';
import { createControllerWiringPaneBindings } from '../../src/features/panel/controller/wiring/controllerWiringPane';

function createContextStub(): PanelControllerContext {
  return {
    initDomRefs: vi.fn(),
    isPickerModeActive: vi.fn(),
    setPickerModeActive: vi.fn(),
    getOutputEl: vi.fn(),
    getTargetSelectEl: vi.fn(),
    getFetchBtnEl: vi.fn(),
    getSelectElementBtnEl: vi.fn(),
    getPayloadModeBtnEl: vi.fn(),
    getComponentSearchInputEl: vi.fn(),
    getReactPayloadMode: vi.fn(() => 'lite'),
    setReactPayloadMode: vi.fn(),
    getElementOutputEl: vi.fn(),
    getDomTreeStatusEl: vi.fn(),
    getDomTreeOutputEl: vi.fn(),
    getReactStatusEl: vi.fn(),
    getReactComponentListEl: vi.fn(),
    getTreePaneEl: vi.fn(),
    getReactComponentDetailEl: vi.fn(),
    getDebugDiagnosticsPaneEl: vi.fn(),
    getDebugLogPaneEl: vi.fn(),
    getDebugLogCopyBtnEl: vi.fn(),
    getPanelWorkspaceEl: vi.fn(),
    getPanelContentEl: vi.fn(),
    getWorkspacePanelToggleBarEl: vi.fn(),
    getWorkspaceDockPreviewEl: vi.fn(),
    getWorkspacePanelElements: vi.fn(),
    getWorkspaceLayoutManager: vi.fn(),
    setWorkspaceLayoutManager: vi.fn(),
    getDestroyWheelScrollFallback: vi.fn(),
    setDestroyWheelScrollFallback: vi.fn(),
    getRemoveRuntimeMessageListener: vi.fn(),
    setRemoveRuntimeMessageListener: vi.fn(),
  } as unknown as PanelControllerContext;
}

function createReactInspectorStateStub(): ReactInspectorControllerState {
  return {
    getStoredLookup: vi.fn(),
    setStoredLookup: vi.fn(),
    getReactComponents: vi.fn(),
    setReactComponents: vi.fn(),
    getSelectedReactComponentIndex: vi.fn(),
    setSelectedReactComponentIndex: vi.fn(),
    getComponentSearchQuery: vi.fn(),
    setComponentSearchQuery: vi.fn(),
    getComponentSearchIncludeDataTokens: vi.fn(),
    setComponentSearchIncludeDataTokens: vi.fn(),
    getComponentSearchTexts: vi.fn(),
    setComponentSearchTexts: vi.fn(),
    getCollapsedComponentIds: vi.fn(),
    setCollapsedComponentIds: vi.fn(),
    getLastReactListRenderSignature: vi.fn(),
    setLastReactListRenderSignature: vi.fn(),
    getLastReactDetailRenderSignature: vi.fn(),
    setLastReactDetailRenderSignature: vi.fn(),
    getLastReactDetailComponentId: vi.fn(),
    setLastReactDetailComponentId: vi.fn(),
    readApplyResultState: vi.fn(),
    writeApplyResultState: vi.fn(),
    writeResetState: vi.fn(),
    readListRenderState: vi.fn(),
    writeListRenderState: vi.fn(),
    readDetailRenderState: vi.fn(),
    writeDetailRenderState: vi.fn(),
  } as unknown as ReactInspectorControllerState;
}

describe('createControllerWiringPaneBindings', () => {
  it('builds pane/debug bindings through injected dependencies', () => {
    const panelControllerContext = createContextStub();
    const reactInspectorState = createReactInspectorStateStub();
    const appendDebugLog = vi.fn();

    const setOutput = vi.fn();
    const setElementOutput = vi.fn();
    const setReactStatus = vi.fn();
    const setReactListEmpty = vi.fn();
    const setReactDetailEmpty = vi.fn();
    const setDomTreeStatus = vi.fn();
    const setDomTreeEmpty = vi.fn();
    const callInspectedPageAgentWithDebug = vi.fn();
    const setOutputWithDebug = vi.fn();
    const setElementOutputWithDebug = vi.fn();
    const setReactStatusWithDebug = vi.fn();
    const setDomTreeStatusWithDebug = vi.fn();
    const setDomTreeEmptyWithDebug = vi.fn();

    const createPanelPaneSetters = vi.fn(() => ({
      setOutput,
      setElementOutput,
      setReactStatus,
      setReactListEmpty,
      setReactDetailEmpty,
      setDomTreeStatus,
      setDomTreeEmpty,
    }));
    const createDebugPageAgentCaller = vi.fn(() => callInspectedPageAgentWithDebug);
    const createDebugPaneSetters = vi.fn(() => ({
      setOutputWithDebug,
      setElementOutputWithDebug,
      setReactStatusWithDebug,
      setDomTreeStatusWithDebug,
      setDomTreeEmptyWithDebug,
    }));

    const bindings = createControllerWiringPaneBindings(
      {
        panelControllerContext,
        reactInspectorState,
        appendDebugLog,
      },
      {
        callInspectedPageAgent: vi.fn(),
        createPanelPaneSetters,
        createDebugPageAgentCaller,
        createDebugPaneSetters,
      },
    );

    expect(createPanelPaneSetters).toHaveBeenCalledWith(
      expect.objectContaining({
        getOutputEl: panelControllerContext.getOutputEl,
        getReactStatusEl: panelControllerContext.getReactStatusEl,
        setLastReactListRenderSignature: reactInspectorState.setLastReactListRenderSignature,
      }),
    );
    expect(createDebugPageAgentCaller).toHaveBeenCalledWith(
      expect.objectContaining({
        appendDebugLog,
      }),
    );
    expect(createDebugPaneSetters).toHaveBeenCalledWith(
      expect.objectContaining({
        appendDebugLog,
        setOutput,
        setElementOutput,
      }),
    );
    expect(bindings).toEqual(
      expect.objectContaining({
        callInspectedPageAgentWithDebug,
        setOutputWithDebug,
        setElementOutputWithDebug,
        setReactStatusWithDebug,
        setDomTreeStatusWithDebug,
        setDomTreeEmptyWithDebug,
        setReactListEmpty,
        setReactDetailEmpty,
      }),
    );
  });
});
