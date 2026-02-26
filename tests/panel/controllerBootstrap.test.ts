import { describe, expect, it, vi } from 'vitest';
import { createPanelControllerBootstrap } from '../../src/features/panel/controller/bootstrap';
import type { PanelControllerContext } from '../../src/features/panel/controller/context';

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
    getReactPayloadMode: vi.fn(),
    setReactPayloadMode: vi.fn(),
    getElementOutputEl: vi.fn(),
    getDomTreeStatusEl: vi.fn(),
    getDomTreeOutputEl: vi.fn(),
    getReactStatusEl: vi.fn(),
    getReactComponentListEl: vi.fn(),
    getTreePaneEl: vi.fn(),
    getReactComponentDetailEl: vi.fn(),
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

describe('createPanelControllerBootstrap', () => {
  it('wires workspace initialization and bootstrap flow through context getters', () => {
    const panelControllerContext = createContextStub();
    const initializeWorkspaceLayout = vi.fn();
    const initializeWheelFallback = vi.fn();
    const bootstrapPanel = vi.fn();
    const createPanelWorkspaceInitialization = vi.fn(() => ({
      initializeWorkspaceLayout,
      initializeWheelFallback,
    }));
    const createPanelBootstrapFlow = vi.fn(() => ({
      bootstrapPanel,
    }));
    const createWorkspaceInitializationBindings = vi.fn(() => ({
      getPanelWorkspaceEl: panelControllerContext.getPanelWorkspaceEl,
    }));
    const createBootstrapFlowBindings = vi.fn(() => ({
      initDomRefs: panelControllerContext.initDomRefs,
    }));

    const result = createPanelControllerBootstrap(
      {
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
      },
      {
        createPanelWorkspaceInitialization,
        createPanelBootstrapFlow,
        createWorkspaceInitializationBindings,
        createBootstrapFlowBindings,
      },
    );

    expect(createWorkspaceInitializationBindings).toHaveBeenCalledWith(
      expect.objectContaining({
        panelControllerContext,
      }),
    );
    expect(createPanelWorkspaceInitialization).toHaveBeenCalledWith(
      expect.objectContaining({
        getPanelWorkspaceEl: panelControllerContext.getPanelWorkspaceEl,
      }),
    );
    expect(createBootstrapFlowBindings).toHaveBeenCalledWith(
      expect.objectContaining({
        panelControllerContext,
      }),
      expect.objectContaining({
        initializeWorkspaceLayout,
        initializeWheelFallback,
      }),
    );
    expect(createPanelBootstrapFlow).toHaveBeenCalledWith(
      expect.objectContaining({
        initDomRefs: panelControllerContext.initDomRefs,
      }),
    );
    expect(result.bootstrapPanel).toBe(bootstrapPanel);
  });
});
