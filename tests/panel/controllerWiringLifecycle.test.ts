import { describe, expect, it, vi } from 'vitest';
import type { PanelControllerContext } from '../../src/features/panel/controller/context';
import { createControllerWiringLifecycle } from '../../src/features/panel/controller/wiring/controllerWiringLifecycle';
import type { RuntimeRefreshLookup } from '../../src/features/panel/reactInspector/lookup';

describe('createControllerWiringLifecycle', () => {
  it('wires runtime bindings into bootstrap with refresh/listener wrappers', () => {
    let payloadMode: 'lite' | 'full' = 'lite';
    const panelControllerContext = {
      getReactPayloadMode: vi.fn(() => payloadMode),
      setReactPayloadMode: vi.fn((mode: 'lite' | 'full') => {
        payloadMode = mode;
      }),
    } as unknown as PanelControllerContext;
    const runtimeRefreshScheduler = {
      schedule: vi.fn(),
      refresh: vi.fn(),
      reset: vi.fn(),
      dispose: vi.fn(),
    };
    const onInspectedPageNavigated = vi.fn();
    const onSelectElement = vi.fn();
    const onPanelBeforeUnload = vi.fn();
    const bootstrapPanel = vi.fn();
    const fetchReactInfo = vi.fn();
    const createRuntimeRefreshFetchOptions = vi.fn(() => ({
      keepLookup: true,
      background: true,
    }));
    const createElementSelectionFetchOptions = vi.fn(() => ({
      lightweight: true,
      refreshDetail: true,
    }));
    const addInspectedPageNavigatedListener = vi.fn();
    let capturedRuntimeOptions: any = null;
    let capturedBootstrapOptions: any = null;

    const result = createControllerWiringLifecycle(
      {
        panelControllerContext,
        getStoredLookup: vi.fn(),
        setStoredLookup: vi.fn(),
        fetchReactInfo,
        fetchDomTree: vi.fn(),
        setElementOutput: vi.fn(),
        setReactStatus: vi.fn(),
        setDomTreeStatus: vi.fn(),
        setDomTreeEmpty: vi.fn(),
        populateTargetSelect: vi.fn(),
        onFetch: vi.fn(),
        onComponentSearchInput: vi.fn(),
        clearPageHoverPreview: vi.fn(),
      },
      {
        createPanelControllerRuntime: vi.fn((runtimeOptions: any) => {
          capturedRuntimeOptions = runtimeOptions;
          return {
            runtimeRefreshScheduler,
            onInspectedPageNavigated,
            onSelectElement,
            onPanelBeforeUnload,
          };
        }),
        createPanelControllerBootstrap: vi.fn((bootstrapOptions: any) => {
          capturedBootstrapOptions = bootstrapOptions;
          return { bootstrapPanel };
        }),
        createRuntimeRefreshFetchOptions,
        createElementSelectionFetchOptions,
        mountPanelView: vi.fn(),
        createWorkspaceLayoutManager: vi.fn() as any,
        initWheelScrollFallback: vi.fn() as any,
        getInspectedTabId: vi.fn(() => 1),
        removeInspectedPageNavigatedListener: vi.fn(),
        addInspectedPageNavigatedListener,
      },
    );

    const lookup: RuntimeRefreshLookup = { selector: '#root', pickPoint: { x: 10, y: 12 } };
    const runtimeDone = vi.fn();
    capturedRuntimeOptions.fetchReactInfoForRuntimeRefresh(lookup, true, runtimeDone);
    expect(createRuntimeRefreshFetchOptions).toHaveBeenCalledWith(true, 'lite', runtimeDone);
    expect(fetchReactInfo).toHaveBeenCalledWith('#root', lookup.pickPoint, {
      keepLookup: true,
      background: true,
    });

    capturedRuntimeOptions.fetchReactInfoForElementSelection('#app', { x: 4, y: 5 });
    expect(createElementSelectionFetchOptions).toHaveBeenCalledWith('lite');
    expect(fetchReactInfo).toHaveBeenCalledWith('#app', { x: 4, y: 5 }, {
      lightweight: true,
      refreshDetail: true,
    });

    expect(capturedBootstrapOptions.onSelectElement).toBe(onSelectElement);
    expect(capturedBootstrapOptions.onPanelBeforeUnload).toBe(onPanelBeforeUnload);
    capturedBootstrapOptions.addNavigatedListener();
    expect(addInspectedPageNavigatedListener).toHaveBeenCalledWith(onInspectedPageNavigated);
    capturedBootstrapOptions.onTogglePayloadMode();
    expect(panelControllerContext.setReactPayloadMode).toHaveBeenCalledWith('full');
    expect(runtimeRefreshScheduler.refresh).toHaveBeenCalledWith(false);
    capturedBootstrapOptions.runInitialRefresh();
    expect(runtimeRefreshScheduler.refresh).toHaveBeenCalledWith(false);
    expect(result.bootstrapPanel).toBe(bootstrapPanel);
  });
});
