import type { PickPoint } from '../../../../shared/inspector';
import { createPanelControllerBootstrap as createPanelControllerBootstrapValue } from '../../controllerBootstrap';
import type { PanelControllerContext } from '../../controllerContext';
import { mountPanelView as mountPanelViewValue } from '../../domRefs';
import {
  addInspectedPageNavigatedListener as addInspectedPageNavigatedListenerValue,
  getInspectedTabId as getInspectedTabIdValue,
  removeInspectedPageNavigatedListener as removeInspectedPageNavigatedListenerValue,
} from '../../devtoolsNetworkBridge';
import { createPanelControllerRuntime as createPanelControllerRuntimeValue } from '../../controllerRuntime';
import {
  createElementSelectionFetchOptions as createElementSelectionFetchOptionsValue,
  createRuntimeRefreshFetchOptions as createRuntimeRefreshFetchOptionsValue,
  type FetchReactInfoOptions,
} from '../../reactInspector/fetchOptions';
import type { RuntimeRefreshLookup } from '../../reactInspector/lookup';
import { createWorkspaceLayoutManager as createWorkspaceLayoutManagerValue } from '../../workspace/manager';
import { initWheelScrollFallback as initWheelScrollFallbackValue } from '../../workspace/wheelScrollFallback';

interface CreateControllerWiringLifecycleOptions {
  panelControllerContext: PanelControllerContext;
  getStoredLookup: () => RuntimeRefreshLookup | null;
  setStoredLookup: (lookup: RuntimeRefreshLookup | null) => void;
  fetchReactInfo: (
    selector: string,
    pickPoint?: PickPoint,
    fetchOptions?: FetchReactInfoOptions,
  ) => void;
  fetchDomTree: (selector: string, pickPoint?: PickPoint) => void;
  setElementOutput: (text: string) => void;
  setReactStatus: (text: string, isError?: boolean) => void;
  setDomTreeStatus: (text: string, isError?: boolean) => void;
  setDomTreeEmpty: (text: string) => void;
  populateTargetSelect: () => void;
  onFetch: () => void;
  onComponentSearchInput: () => void;
  clearPageHoverPreview: () => void;
}

interface ControllerWiringLifecycleDependencies {
  createPanelControllerRuntime: typeof createPanelControllerRuntimeValue;
  createPanelControllerBootstrap: typeof createPanelControllerBootstrapValue;
  createRuntimeRefreshFetchOptions: typeof createRuntimeRefreshFetchOptionsValue;
  createElementSelectionFetchOptions: typeof createElementSelectionFetchOptionsValue;
  mountPanelView: typeof mountPanelViewValue;
  createWorkspaceLayoutManager: typeof createWorkspaceLayoutManagerValue;
  initWheelScrollFallback: typeof initWheelScrollFallbackValue;
  getInspectedTabId: typeof getInspectedTabIdValue;
  removeInspectedPageNavigatedListener: typeof removeInspectedPageNavigatedListenerValue;
  addInspectedPageNavigatedListener: typeof addInspectedPageNavigatedListenerValue;
}

const DEFAULT_DEPS: ControllerWiringLifecycleDependencies = {
  createPanelControllerRuntime: createPanelControllerRuntimeValue,
  createPanelControllerBootstrap: createPanelControllerBootstrapValue,
  createRuntimeRefreshFetchOptions: createRuntimeRefreshFetchOptionsValue,
  createElementSelectionFetchOptions: createElementSelectionFetchOptionsValue,
  mountPanelView: mountPanelViewValue,
  createWorkspaceLayoutManager: createWorkspaceLayoutManagerValue,
  initWheelScrollFallback: initWheelScrollFallbackValue,
  getInspectedTabId: getInspectedTabIdValue,
  removeInspectedPageNavigatedListener: removeInspectedPageNavigatedListenerValue,
  addInspectedPageNavigatedListener: addInspectedPageNavigatedListenerValue,
};

/**
 * controller wiring의 runtime + bootstrap 결선을 조립한다.
 * fetch option preset, navigated listener, initial refresh trigger를 한 곳에서 고정한다.
 */
function createControllerWiringLifecycle(
  options: CreateControllerWiringLifecycleOptions,
  deps: ControllerWiringLifecycleDependencies = DEFAULT_DEPS,
) {
  const {
    runtimeRefreshScheduler,
    onInspectedPageNavigated,
    onSelectElement,
    onPanelBeforeUnload,
  } = deps.createPanelControllerRuntime({
    panelControllerContext: options.panelControllerContext,
    getStoredLookup: options.getStoredLookup,
    setStoredLookup: options.setStoredLookup,
    fetchReactInfoForRuntimeRefresh: (lookup, background, onDone) => {
      options.fetchReactInfo(
        lookup.selector,
        lookup.pickPoint,
        deps.createRuntimeRefreshFetchOptions(background, onDone),
      );
    },
    fetchReactInfoForElementSelection: (selector, pickPoint) => {
      options.fetchReactInfo(selector, pickPoint, deps.createElementSelectionFetchOptions());
    },
    clearPageHoverPreview: options.clearPageHoverPreview,
    fetchDomTree: options.fetchDomTree,
    setElementOutput: options.setElementOutput,
    setReactStatus: options.setReactStatus,
    setDomTreeStatus: options.setDomTreeStatus,
    setDomTreeEmpty: options.setDomTreeEmpty,
    getInspectedTabId: deps.getInspectedTabId,
    removeNavigatedListener: deps.removeInspectedPageNavigatedListener,
  });

  return deps.createPanelControllerBootstrap({
    panelControllerContext: options.panelControllerContext,
    mountPanelView: deps.mountPanelView,
    createWorkspaceLayoutManager: deps.createWorkspaceLayoutManager,
    initWheelScrollFallback: deps.initWheelScrollFallback,
    populateTargetSelect: options.populateTargetSelect,
    setElementOutput: options.setElementOutput,
    setDomTreeStatus: options.setDomTreeStatus,
    setDomTreeEmpty: options.setDomTreeEmpty,
    onFetch: options.onFetch,
    onSelectElement,
    onComponentSearchInput: options.onComponentSearchInput,
    clearPageHoverPreview: options.clearPageHoverPreview,
    addNavigatedListener: () => {
      deps.addInspectedPageNavigatedListener(onInspectedPageNavigated);
    },
    onPanelBeforeUnload,
    runInitialRefresh: () => {
      runtimeRefreshScheduler.refresh(false);
    },
  });
}

export { createControllerWiringLifecycle };
export type {
  CreateControllerWiringLifecycleOptions,
  ControllerWiringLifecycleDependencies,
};
