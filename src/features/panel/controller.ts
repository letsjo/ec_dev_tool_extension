/**
 * DevTools Panel 핵심 컨트롤러.
 *
 * 흐름 요약:
 * 1. PanelViewSection(정적 골격)를 마운트하고 DOM 참조를 연결한다.
 * 2. background/content/pageAgent와 통신해 React/DOM 데이터를 조회한다.
 * 3. Components Tree, Inspector, Selected Element/DOM Path/DOM Tree, Raw Result를 렌더링한다.
 * 4. 스플릿/검색/선택/하이라이트/런타임 갱신 상태를 동기화한다.
 */
import { createWorkspaceLayoutManager } from './workspace/manager';
import { initWheelScrollFallback } from './workspace/wheelScrollFallback';
import {
  initPanelDomRefs as initPanelDomRefsValue,
  mountPanelView as mountPanelViewValue,
} from './domRefs';
import {
  createElementSelectionFetchOptions as createElementSelectionFetchOptionsValue,
  createRuntimeRefreshFetchOptions as createRuntimeRefreshFetchOptionsValue,
} from './reactInspector/fetchOptions';
import { createReactInspectPathBindings as createReactInspectPathBindingsValue } from './reactInspector/pathBindings';
import { createReactInspectorControllerState } from './reactInspector/controllerState';
import { createReactInspectorControllerFlows as createReactInspectorControllerFlowsValue } from './reactInspector/controllerFlows';
import { createDomTreeFetchFlow as createDomTreeFetchFlowValue } from './domTree/fetchFlow';
import { createPanelBootstrapFlow as createPanelBootstrapFlowValue } from './lifecycle/bootstrapFlow';
import { renderPanelFatalErrorView as renderPanelFatalErrorViewValue } from './lifecycle/fatalErrorView';
import { createPanelWorkspaceInitialization as createPanelWorkspaceInitializationValue } from './lifecycle/panelWorkspaceInitialization';
import { createTargetFetchFlow as createTargetFetchFlowValue } from './targetFetch/flow';
import { callInspectedPageAgent } from './bridge/pageAgentClient';
import { createPanelPaneSetters as createPanelPaneSettersValue } from './paneSetters';
import { createPanelSelectionSyncHandlers } from './pageAgent/selectionSync';
import { createPanelControllerContext } from './controllerContext';
import { createPanelControllerRuntime as createPanelControllerRuntimeValue } from './controllerRuntime';

const DETAIL_FETCH_RETRY_COOLDOWN_MS = 2500;
const reactInspectorState = createReactInspectorControllerState();
const panelControllerContext = createPanelControllerContext({
  initPanelDomRefs: initPanelDomRefsValue,
});
const mountPanelView = mountPanelViewValue;

const {
  setOutput,
  setElementOutput,
  setReactStatus,
  setReactListEmpty,
  setReactDetailEmpty,
  setDomTreeStatus,
  setDomTreeEmpty,
} = createPanelPaneSettersValue({
  getOutputEl: panelControllerContext.getOutputEl,
  getElementOutputEl: panelControllerContext.getElementOutputEl,
  getReactStatusEl: panelControllerContext.getReactStatusEl,
  getReactComponentListEl: panelControllerContext.getReactComponentListEl,
  getReactComponentDetailEl: panelControllerContext.getReactComponentDetailEl,
  getDomTreeStatusEl: panelControllerContext.getDomTreeStatusEl,
  getDomTreeOutputEl: panelControllerContext.getDomTreeOutputEl,
  setLastReactListRenderSignature: reactInspectorState.setLastReactListRenderSignature,
  setLastReactDetailRenderSignature: reactInspectorState.setLastReactDetailRenderSignature,
  setLastReactDetailComponentId: reactInspectorState.setLastReactDetailComponentId,
});

const { populateTargetSelect, onFetch } = createTargetFetchFlowValue({
  getTargetSelectEl: panelControllerContext.getTargetSelectEl,
  getFetchBtnEl: panelControllerContext.getFetchBtnEl,
  setOutput,
  callInspectedPageAgent,
});

const { fetchDomTree } = createDomTreeFetchFlowValue({
  callInspectedPageAgent,
  getDomTreeOutputEl: panelControllerContext.getDomTreeOutputEl,
  setDomTreeStatus,
  setDomTreeEmpty,
});

const {
  clearPageComponentHighlight,
  clearPageHoverPreview,
  previewPageDomForComponent,
  highlightPageDomForComponent,
} = createPanelSelectionSyncHandlers({
  callInspectedPageAgent,
  setReactStatus,
  setElementOutput,
  setDomTreeStatus,
  setDomTreeEmpty,
  fetchDomTree: (selector) => {
    fetchDomTree(selector);
  },
});

const { inspectFunctionAtPath, fetchSerializedValueAtPath } =
  createReactInspectPathBindingsValue({
    callInspectedPageAgent,
    getStoredLookup: reactInspectorState.getStoredLookup,
    setReactStatus,
  });

const { onComponentSearchInput, fetchReactInfo } = createReactInspectorControllerFlowsValue({
  state: reactInspectorState,
  callInspectedPageAgent,
  getReactComponentListEl: panelControllerContext.getReactComponentListEl,
  getTreePaneEl: panelControllerContext.getTreePaneEl,
  getReactComponentDetailEl: panelControllerContext.getReactComponentDetailEl,
  getComponentSearchInputEl: panelControllerContext.getComponentSearchInputEl,
  setReactStatus,
  setReactListEmpty,
  setReactDetailEmpty,
  clearPageHoverPreview,
  clearPageComponentHighlight,
  previewPageDomForComponent,
  highlightPageDomForComponent,
  setDomTreeStatus,
  setDomTreeEmpty,
  inspectFunctionAtPath,
  fetchSerializedValueAtPath,
  detailFetchRetryCooldownMs: DETAIL_FETCH_RETRY_COOLDOWN_MS,
});

const {
  runtimeRefreshScheduler,
  onInspectedPageNavigated,
  onSelectElement,
  onPanelBeforeUnload,
} = createPanelControllerRuntimeValue({
  panelControllerContext,
  getStoredLookup: reactInspectorState.getStoredLookup,
  setStoredLookup: reactInspectorState.setStoredLookup,
  fetchReactInfoForRuntimeRefresh: (lookup, background, onDone) => {
    fetchReactInfo(
      lookup.selector,
      lookup.pickPoint,
      createRuntimeRefreshFetchOptionsValue(background, onDone),
    );
  },
  fetchReactInfoForElementSelection: (selector, pickPoint) => {
    fetchReactInfo(selector, pickPoint, createElementSelectionFetchOptionsValue());
  },
  clearPageHoverPreview,
  fetchDomTree,
  setElementOutput,
  setReactStatus,
  setDomTreeStatus,
  setDomTreeEmpty,
  getInspectedTabId: () => chrome.devtools.inspectedWindow.tabId,
  removeNavigatedListener(listener) {
    chrome.devtools.network.onNavigated.removeListener(listener);
  },
});

const { initializeWorkspaceLayout, initializeWheelFallback } =
  createPanelWorkspaceInitializationValue({
    getPanelWorkspaceEl: panelControllerContext.getPanelWorkspaceEl,
    getPanelContentEl: panelControllerContext.getPanelContentEl,
    getWorkspacePanelToggleBarEl: panelControllerContext.getWorkspacePanelToggleBarEl,
    getWorkspaceDockPreviewEl: panelControllerContext.getWorkspaceDockPreviewEl,
    getWorkspacePanelElements: panelControllerContext.getWorkspacePanelElements,
    createWorkspaceLayoutManager,
    initWheelScrollFallback,
    setWorkspaceLayoutManager: panelControllerContext.setWorkspaceLayoutManager,
    setDestroyWheelScrollFallback: panelControllerContext.setDestroyWheelScrollFallback,
  });

const { bootstrapPanel } = createPanelBootstrapFlowValue({
  mountPanelView,
  initDomRefs: panelControllerContext.initDomRefs,
  initializeWorkspaceLayout,
  initializeWheelFallback,
  setPickerModeActive: panelControllerContext.setPickerModeActive,
  populateTargetSelect,
  setElementOutput,
  setDomTreeStatus,
  setDomTreeEmpty,
  getFetchBtnEl: panelControllerContext.getFetchBtnEl,
  getSelectElementBtnEl: panelControllerContext.getSelectElementBtnEl,
  getComponentSearchInputEl: panelControllerContext.getComponentSearchInputEl,
  getReactComponentListEl: panelControllerContext.getReactComponentListEl,
  onFetch,
  onSelectElement,
  onComponentSearchInput,
  clearPageHoverPreview,
  addNavigatedListener: () => {
    chrome.devtools.network.onNavigated.addListener(onInspectedPageNavigated);
  },
  onBeforeUnload: onPanelBeforeUnload,
  runInitialRefresh: () => {
    runtimeRefreshScheduler.refresh(false);
  },
});

/** 엔트리 실행을 시작 */
export function runPanel() {
  try {
    bootstrapPanel();
  } catch (error) {
    console.error('[EC Dev Tool] panel bootstrap failed', error);
    renderPanelFatalErrorViewValue(error);
  }
}
