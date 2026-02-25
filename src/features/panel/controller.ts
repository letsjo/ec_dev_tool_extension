/**
 * DevTools Panel 핵심 컨트롤러.
 *
 * 흐름 요약:
 * 1. PanelViewSection(정적 골격)를 마운트하고 DOM 참조를 연결한다.
 * 2. background/content/pageAgent와 통신해 React/DOM 데이터를 조회한다.
 * 3. Components Tree, Inspector, Selected Element/DOM Path/DOM Tree, Raw Result를 렌더링한다.
 * 4. 스플릿/검색/선택/하이라이트/런타임 갱신 상태를 동기화한다.
 */
import type { WorkspacePanelId } from './workspacePanels';
import {
  createWorkspaceLayoutManager,
  type WorkspaceLayoutManager,
} from './workspace/manager';
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
import { createElementPickerBridgeFlow as createElementPickerBridgeFlowValue } from './elementPicker/bridgeFlow';
import { createPanelBootstrapFlow as createPanelBootstrapFlowValue } from './lifecycle/bootstrapFlow';
import { renderPanelFatalErrorView as renderPanelFatalErrorViewValue } from './lifecycle/fatalErrorView';
import { createPanelTeardownFlow as createPanelTeardownFlowValue } from './lifecycle/panelTeardownFlow';
import { createPanelWorkspaceInitialization as createPanelWorkspaceInitializationValue } from './lifecycle/panelWorkspaceInitialization';
import { bindRuntimeMessageListener as bindRuntimeMessageListenerValue } from './lifecycle/runtimeMessageBinding';
import { createTargetFetchFlow as createTargetFetchFlowValue } from './targetFetch/flow';
import { callInspectedPageAgent } from './bridge/pageAgentClient';
import { createPanelSelectionSyncHandlers } from './pageAgent/selectionSync';
import { createPanelRuntimeRefreshFlow as createPanelRuntimeRefreshFlowValue } from './runtimeRefresh/panelRuntimeRefreshFlow';
import {
  setPaneEmptyState as setPaneEmptyStateValue,
  setPaneText as setPaneTextValue,
  setPaneTextWithErrorState as setPaneTextWithErrorStateValue,
} from './paneState';

let outputEl!: HTMLDivElement;
let targetSelectEl: HTMLSelectElement | null = null;
let fetchBtnEl: HTMLButtonElement | null = null;
let selectElementBtnEl!: HTMLButtonElement;
let componentSearchInputEl!: HTMLInputElement;
let elementOutputEl!: HTMLDivElement;
let domTreeStatusEl!: HTMLDivElement;
let domTreeOutputEl!: HTMLDivElement;
let reactStatusEl!: HTMLDivElement;
let reactComponentListEl!: HTMLDivElement;
let treePaneEl!: HTMLDivElement;
let reactComponentDetailEl!: HTMLDivElement;
let panelWorkspaceEl!: HTMLElement;
let panelContentEl!: HTMLElement;
let workspacePanelToggleBarEl!: HTMLDivElement;
let workspaceDockPreviewEl!: HTMLDivElement;

let pickerModeActive = false;
const reactInspectorState = createReactInspectorControllerState();

const DETAIL_FETCH_RETRY_COOLDOWN_MS = 2500;

let destroyWheelScrollFallback: (() => void) | null = null;
let removeRuntimeMessageListener: (() => void) | null = null;
let workspacePanelElements = new Map<WorkspacePanelId, HTMLDetailsElement>();
let workspaceLayoutManager: WorkspaceLayoutManager | null = null;

const mountPanelView = mountPanelViewValue;

/**
 * 패널 동작에 필요한 주요 DOM 참조를 한 곳에서 초기화한다.
 * 이 함수 이후에는 하위 로직이 전역 ref를 신뢰하고 동작하므로,
 * 필수 노드는 `getRequiredElement`로 즉시 실패하게 한다.
 */
function initDomRefs() {
  const refs = initPanelDomRefsValue();
  outputEl = refs.outputEl;
  targetSelectEl = refs.targetSelectEl;
  fetchBtnEl = refs.fetchBtnEl;
  panelWorkspaceEl = refs.panelWorkspaceEl;
  panelContentEl = refs.panelContentEl;
  workspacePanelToggleBarEl = refs.workspacePanelToggleBarEl;
  workspaceDockPreviewEl = refs.workspaceDockPreviewEl;
  selectElementBtnEl = refs.selectElementBtnEl;
  componentSearchInputEl = refs.componentSearchInputEl;
  elementOutputEl = refs.elementOutputEl;
  domTreeStatusEl = refs.domTreeStatusEl;
  domTreeOutputEl = refs.domTreeOutputEl;
  reactStatusEl = refs.reactStatusEl;
  reactComponentListEl = refs.reactComponentListEl;
  treePaneEl = refs.treePaneEl;
  reactComponentDetailEl = refs.reactComponentDetailEl;
  workspacePanelElements = refs.workspacePanelElements;
}

/** UI 상태 또는 문구를 설정 */
function setPickerModeActive(active: boolean) {
  pickerModeActive = active;
  selectElementBtnEl.classList.toggle('active', active);
  selectElementBtnEl.setAttribute('aria-pressed', active ? 'true' : 'false');
  selectElementBtnEl.title = active ? '요소 선택 중 (Esc로 취소)' : '요소 선택 모드 시작';
}

/** UI 상태 또는 문구를 설정 */
function setOutput(text: string, isError = false) {
  setPaneTextWithErrorStateValue(outputEl, text, isError);
}

const { populateTargetSelect, onFetch } = createTargetFetchFlowValue({
  getTargetSelectEl: () => targetSelectEl,
  getFetchBtnEl: () => fetchBtnEl,
  setOutput,
  callInspectedPageAgent,
});

/** UI 상태 또는 문구를 설정 */
function setElementOutput(text: string) {
  setPaneTextValue(elementOutputEl, text);
}

/** UI 상태 또는 문구를 설정 */
function setReactStatus(text: string, isError = false) {
  setPaneTextWithErrorStateValue(reactStatusEl, text, isError);
}

/** UI 상태 또는 문구를 설정 */
function setReactListEmpty(text: string) {
  reactInspectorState.setLastReactListRenderSignature(
    setPaneEmptyStateValue(reactComponentListEl, text),
  );
}

/** UI 상태 또는 문구를 설정 */
function setReactDetailEmpty(text: string) {
  reactInspectorState.setLastReactDetailRenderSignature(
    setPaneEmptyStateValue(reactComponentDetailEl, text),
  );
  reactInspectorState.setLastReactDetailComponentId(null);
}

/** UI 상태 또는 문구를 설정 */
function setDomTreeStatus(text: string, isError = false) {
  setPaneTextWithErrorStateValue(domTreeStatusEl, text, isError);
}

/** UI 상태 또는 문구를 설정 */
function setDomTreeEmpty(text: string) {
  setPaneTextValue(domTreeOutputEl, text);
}

const { fetchDomTree } = createDomTreeFetchFlowValue({
  callInspectedPageAgent,
  domTreeOutputEl,
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
  reactComponentListEl,
  treePaneEl,
  reactComponentDetailEl,
  componentSearchInputEl,
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

const { runtimeRefreshScheduler, onInspectedPageNavigated } =
  createPanelRuntimeRefreshFlowValue({
    isPickerModeActive: () => pickerModeActive,
    getStoredLookup: reactInspectorState.getStoredLookup,
    setStoredLookup: reactInspectorState.setStoredLookup,
    runRefresh: (lookup, background, onDone) => {
      fetchReactInfo(
        lookup.selector,
        lookup.pickPoint,
        createRuntimeRefreshFetchOptionsValue(background, onDone),
      );
    },
    setElementOutput,
    setDomTreeStatus,
    setDomTreeEmpty,
  });

/**
 * 요소 선택 모드를 시작한다.
 * 실제 선택 완료/취소/런타임 갱신 이벤트는 runtime 메시지 핸들러에서 이어서 처리된다.
 */
const { onSelectElement, onRuntimeMessage } = createElementPickerBridgeFlowValue({
  getInspectedTabId: () => chrome.devtools.inspectedWindow.tabId,
  clearPageHoverPreview,
  setPickerModeActive,
  setElementOutput,
  setReactStatus,
  setDomTreeStatus,
  setDomTreeEmpty,
  fetchDomTree,
  fetchReactInfoForElementSelection: (selector, pickPoint) => {
    fetchReactInfo(selector, pickPoint, createElementSelectionFetchOptionsValue());
  },
  scheduleRuntimeRefresh: () => {
    runtimeRefreshScheduler.schedule(true);
  },
});

removeRuntimeMessageListener = bindRuntimeMessageListenerValue(onRuntimeMessage, {
  addListener(listener) {
    chrome.runtime.onMessage.addListener(listener);
  },
  removeListener(listener) {
    chrome.runtime.onMessage.removeListener(listener);
  },
});

const onPanelBeforeUnload = createPanelTeardownFlowValue({
  getWorkspaceLayoutManager: () => workspaceLayoutManager,
  setWorkspaceLayoutManager: (manager) => {
    workspaceLayoutManager = manager;
  },
  getDestroyWheelScrollFallback: () => destroyWheelScrollFallback,
  setDestroyWheelScrollFallback: (destroyer) => {
    destroyWheelScrollFallback = destroyer;
  },
  getRemoveRuntimeMessageListener: () => removeRuntimeMessageListener,
  setRemoveRuntimeMessageListener: (removeListener) => {
    removeRuntimeMessageListener = removeListener;
  },
  runtimeRefreshScheduler,
  removeNavigatedListener: () => {
    chrome.devtools.network.onNavigated.removeListener(onInspectedPageNavigated);
  },
});

const { initializeWorkspaceLayout, initializeWheelFallback } =
  createPanelWorkspaceInitializationValue({
    getPanelWorkspaceEl: () => panelWorkspaceEl,
    getPanelContentEl: () => panelContentEl,
    getWorkspacePanelToggleBarEl: () => workspacePanelToggleBarEl,
    getWorkspaceDockPreviewEl: () => workspaceDockPreviewEl,
    getWorkspacePanelElements: () => workspacePanelElements,
    createWorkspaceLayoutManager,
    initWheelScrollFallback,
    setWorkspaceLayoutManager: (manager) => {
      workspaceLayoutManager = manager;
    },
    setDestroyWheelScrollFallback: (destroyer) => {
      destroyWheelScrollFallback = destroyer;
    },
  });

const { bootstrapPanel } = createPanelBootstrapFlowValue({
  mountPanelView,
  initDomRefs,
  initializeWorkspaceLayout,
  initializeWheelFallback,
  setPickerModeActive,
  populateTargetSelect,
  setElementOutput,
  setDomTreeStatus,
  setDomTreeEmpty,
  getFetchBtnEl: () => fetchBtnEl,
  getSelectElementBtnEl: () => selectElementBtnEl,
  getComponentSearchInputEl: () => componentSearchInputEl,
  getReactComponentListEl: () => reactComponentListEl,
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
