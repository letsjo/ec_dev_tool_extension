import { describe, expect, it, vi } from 'vitest';
import type { PanelControllerContext } from '../../src/features/panel/controller/context';
import {
  createBootstrapFlowBindings,
  createWorkspaceInitializationBindings,
} from '../../src/features/panel/controller/bootstrapBindings';

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

describe('controller bootstrap bindings', () => {
  it('maps context getters/setters into workspace initialization bindings', () => {
    const panelControllerContext = createContextStub();
    const options = {
      panelControllerContext,
      mountPanelView: vi.fn(),
      createWorkspaceLayoutManager: vi.fn() as any,
      initWheelScrollFallback: vi.fn() as any,
      populateTargetSelect: vi.fn(),
      setElementOutput: vi.fn(),
      setDomTreeStatus: vi.fn(),
      setDomTreeEmpty: vi.fn(),
      onFetch: vi.fn(),
      onSelectElement: vi.fn(),
      onTogglePayloadMode: vi.fn(),
      onComponentSearchInput: vi.fn(),
      clearPageHoverPreview: vi.fn(),
      addNavigatedListener: vi.fn(),
      onPanelBeforeUnload: vi.fn(),
      runInitialRefresh: vi.fn(),
    };

    const bindings = createWorkspaceInitializationBindings(options);
    expect(bindings).toEqual(
      expect.objectContaining({
        getPanelWorkspaceEl: panelControllerContext.getPanelWorkspaceEl,
        getPanelContentEl: panelControllerContext.getPanelContentEl,
        getWorkspacePanelToggleBarEl: panelControllerContext.getWorkspacePanelToggleBarEl,
        setWorkspaceLayoutManager: panelControllerContext.setWorkspaceLayoutManager,
      }),
    );
  });

  it('maps workspace init callbacks and panel handlers into bootstrap flow bindings', () => {
    const panelControllerContext = createContextStub();
    const options = {
      panelControllerContext,
      mountPanelView: vi.fn(),
      createWorkspaceLayoutManager: vi.fn() as any,
      initWheelScrollFallback: vi.fn() as any,
      populateTargetSelect: vi.fn(),
      setElementOutput: vi.fn(),
      setDomTreeStatus: vi.fn(),
      setDomTreeEmpty: vi.fn(),
      onFetch: vi.fn(),
      onSelectElement: vi.fn(),
      onTogglePayloadMode: vi.fn(),
      onComponentSearchInput: vi.fn(),
      clearPageHoverPreview: vi.fn(),
      addNavigatedListener: vi.fn(),
      onPanelBeforeUnload: vi.fn(),
      runInitialRefresh: vi.fn(),
    };

    const bindings = createBootstrapFlowBindings(options, {
      initializeWorkspaceLayout: vi.fn(),
      initializeWheelFallback: vi.fn(),
    });
    expect(bindings).toEqual(
      expect.objectContaining({
        mountPanelView: options.mountPanelView,
        initDomRefs: panelControllerContext.initDomRefs,
        getPayloadModeBtnEl: panelControllerContext.getPayloadModeBtnEl,
        onTogglePayloadMode: options.onTogglePayloadMode,
        onBeforeUnload: options.onPanelBeforeUnload,
      }),
    );
  });
});
