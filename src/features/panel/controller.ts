/**
 * DevTools Panel 핵심 컨트롤러.
 *
 * 흐름 요약:
 * 1. PanelViewSection(정적 골격)를 마운트하고 DOM 참조를 연결한다.
 * 2. background/content/pageAgent와 통신해 React/DOM 데이터를 조회한다.
 * 3. Components Tree, Inspector, Selected Element/DOM Path/DOM Tree, Raw Result를 렌더링한다.
 * 4. 스플릿/검색/선택/하이라이트/런타임 갱신 상태를 동기화한다.
 */
import type {
  ComponentFilterResult,
  JsonSectionKind,
  PickPoint,
  ReactComponentDetailResult,
  ReactComponentInfo,
} from '../../shared/inspector/types';
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
  buildReactComponentDetailRenderSignature as buildReactComponentDetailRenderSignatureValue,
  buildReactListRenderSignature as buildReactListRenderSignatureValue,
} from './reactInspector/signatures';
import {
  buildComponentIndexById as buildComponentIndexByIdValue,
  ensureComponentSearchTextCache as ensureComponentSearchTextCacheValue,
  expandAncestorPaths as expandAncestorPathsValue,
  getComponentFilterResult as getComponentFilterResultValue,
  patchComponentSearchTextCacheAt as patchComponentSearchTextCacheAtValue,
} from './reactInspector/search';
import {
  createReactInspectResultApplyFlow as createReactInspectResultApplyFlowValue,
} from './reactInspector/applyResultFlow';
import {
  createElementSelectionFetchOptions as createElementSelectionFetchOptionsValue,
  createRuntimeRefreshFetchOptions as createRuntimeRefreshFetchOptionsValue,
} from './reactInspector/fetchOptions';
import {
  resolveRuntimeRefreshLookup as resolveRuntimeRefreshLookupValue,
  type RuntimeRefreshLookup,
} from './reactInspector/lookup';
import { createReactInspectPathBindings as createReactInspectPathBindingsValue } from './reactInspector/pathBindings';
import { renderReactComponentListTree as renderReactComponentListTreeValue } from './reactInspector/listTreeRenderer';
import { handleComponentSearchInput as handleComponentSearchInputValue } from './reactInspector/searchInputFlow';
import { createReactInspectFetchFlow as createReactInspectFetchFlowValue } from './reactInspector/fetchFlow';
import {
  createReactComponentSelector as createReactComponentSelectorValue,
} from './reactInspector/selection';
import {
  buildSearchNoResultUiText as buildSearchNoResultUiTextValue,
  buildSearchSummaryStatusText as buildSearchSummaryStatusTextValue,
  type SearchNoResultContext,
} from './reactInspector/searchStatus';
import {
  applyReactInspectorPaneState as applyReactInspectorPaneStateValue,
  buildReactComponentListEmptyText as buildReactComponentListEmptyTextValue,
  buildReactInspectorLoadingPaneState as buildReactInspectorLoadingPaneStateValue,
  buildReactInspectorResetPaneState as buildReactInspectorResetPaneStateValue,
} from './reactInspector/viewState';
import { createReactJsonSection as createReactJsonSectionValue } from './reactInspector/jsonSection';
import { createReactDetailFetchQueue } from './reactInspector/detailFetchQueue';
import { renderReactComponentDetailPanel as renderReactComponentDetailPanelValue } from './reactInspector/detailRenderer';
import { applySelectedComponentDetailResult as applySelectedComponentDetailResultValue } from './reactInspector/detailApply';
import { createDomTreeFetchFlow as createDomTreeFetchFlowValue } from './domTree/fetchFlow';
import { createElementPickerBridgeFlow as createElementPickerBridgeFlowValue } from './elementPicker/bridgeFlow';
import { createPanelBootstrapFlow as createPanelBootstrapFlowValue } from './lifecycle/bootstrapFlow';
import { createTargetFetchFlow as createTargetFetchFlowValue } from './targetFetch/flow';
import { callInspectedPageAgent } from './bridge/pageAgentClient';
import { createPanelSelectionSyncHandlers } from './pageAgent/selectionSync';
import { createRuntimeRefreshScheduler } from './runtimeRefresh/scheduler';
import {
  clearPaneContent as clearPaneContentValue,
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

let reactComponents: ReactComponentInfo[] = [];
let selectedReactComponentIndex = -1;
let lastReactLookup: { selector: string; pickPoint?: PickPoint } | null = null;
let componentSearchQuery = '';
let pickerModeActive = false;
let componentSearchTexts: string[] = [];
let componentSearchIncludeDataTokens = true;
let collapsedComponentIds = new Set<string>();
let lastReactListRenderSignature = '';
let lastReactDetailRenderSignature = '';
let lastReactDetailComponentId: string | null = null;
let updatedComponentIds = new Set<string>();

const DETAIL_FETCH_RETRY_COOLDOWN_MS = 2500;

let destroyWheelScrollFallback: (() => void) | null = null;
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
  lastReactListRenderSignature = setPaneEmptyStateValue(reactComponentListEl, text);
}

/** UI 상태 또는 문구를 설정 */
function setReactDetailEmpty(text: string) {
  lastReactDetailRenderSignature = setPaneEmptyStateValue(reactComponentDetailEl, text);
  lastReactDetailComponentId = null;
}

const reactInspectorPaneSetters = {
  setReactStatus,
  setReactListEmpty,
  setReactDetailEmpty,
};

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
    getStoredLookup: () => lastReactLookup,
    setReactStatus,
  });

/** 파생 데이터나 요약 값을 구성 */
function buildReactComponentDetailRenderSignature(component: ReactComponentInfo): string {
  return buildReactComponentDetailRenderSignatureValue(component);
}

/** 파생 데이터나 요약 값을 구성 */
function buildReactListRenderSignature(
  filterResult: ComponentFilterResult,
  matchedIndexSet: Set<number>,
): string {
  return buildReactListRenderSignatureValue(
    reactComponents,
    componentSearchQuery,
    selectedReactComponentIndex,
    collapsedComponentIds,
    filterResult,
    matchedIndexSet,
  );
}

/** 렌더링에 사용할 DOM/데이터 구조를 생성 */
function createJsonSection(
  title: string,
  value: unknown,
  component: ReactComponentInfo,
  sectionKind: JsonSectionKind,
): HTMLElement {
  return createReactJsonSectionValue({
    title,
    value,
    component,
    sectionKind,
    onInspectFunctionAtPath: inspectFunctionAtPath,
    onFetchSerializedValueAtPath: fetchSerializedValueAtPath,
  });
}

/** 필요한 값/상태를 계산해 반환 */
function getComponentFilterResult(): ComponentFilterResult {
  componentSearchTexts = ensureComponentSearchTextCacheValue(
    reactComponents,
    componentSearchQuery,
    componentSearchTexts,
    componentSearchIncludeDataTokens,
  );
  return getComponentFilterResultValue(reactComponents, componentSearchQuery, componentSearchTexts);
}

/** 파생 데이터나 요약 값을 구성 */
function buildComponentIndexById(): Map<string, number> {
  return buildComponentIndexByIdValue(reactComponents);
}

/** 부모 경로를 확장 */
function expandAncestorPaths(indices: number[]) {
  expandAncestorPathsValue(reactComponents, indices, collapsedComponentIds);
}

/** 검색 결과가 비어있을 때 공통 UI 상태를 적용한다. */
function applySearchNoResultState(
  context: SearchNoResultContext,
  options: { clearHoverPreview?: boolean } = {},
) {
  const uiText = buildSearchNoResultUiTextValue(reactComponents.length, context);
  renderReactComponentList();
  setReactDetailEmpty(uiText.detailText);
  setReactStatus(uiText.reactStatusText, true);
  if (options.clearHoverPreview === true) {
    clearPageHoverPreview();
  }
  clearPageComponentHighlight();
  setDomTreeStatus(uiText.domStatusText, true);
  setDomTreeEmpty(uiText.domEmptyText);
}

/** 화면 요소를 렌더링 */
function renderReactComponentDetail(component: ReactComponentInfo) {
  const nextCache = renderReactComponentDetailPanelValue({
    component,
    cache: {
      componentId: lastReactDetailComponentId,
      renderSignature: lastReactDetailRenderSignature,
    },
    reactComponentDetailEl,
    buildRenderSignature: buildReactComponentDetailRenderSignature,
    clearPaneContent: clearPaneContentValue,
    createJsonSection,
  });
  lastReactDetailComponentId = nextCache.componentId;
  lastReactDetailRenderSignature = nextCache.renderSignature;
}

/** 화면 요소를 렌더링 */
function renderReactComponentList() {
  if (reactComponents.length === 0) {
    setReactListEmpty(
      buildReactComponentListEmptyTextValue(reactComponents.length, componentSearchQuery),
    );
    return;
  }

  const filterResult = getComponentFilterResult();
  const visibleIndices = filterResult.visibleIndices;
  const matchedIndexSet = new Set<number>(filterResult.matchedIndices);

  if (visibleIndices.length === 0) {
    setReactListEmpty(
      buildReactComponentListEmptyTextValue(reactComponents.length, componentSearchQuery),
    );
    return;
  }

  const nextSignature = buildReactListRenderSignature(filterResult, matchedIndexSet);
  const forceRenderForUpdates = updatedComponentIds.size > 0;
  if (nextSignature === lastReactListRenderSignature && !forceRenderForUpdates) {
    return;
  }

  renderReactComponentListTreeValue({
    reactComponents,
    visibleIndices,
    matchedIndexSet,
    selectedReactComponentIndex,
    componentSearchQuery,
    collapsedComponentIds,
    updatedComponentIds,
    treePaneEl,
    reactComponentListEl,
    idToIndex: buildComponentIndexById(),
    clearPaneContent: clearPaneContentValue,
    previewPageDomForComponent,
    clearPageHoverPreview,
    onSelectComponent: selectReactComponent,
    onRequestRender: () => {
      renderReactComponentList();
    },
  });

  lastReactListRenderSignature = nextSignature;
  updatedComponentIds = new Set<string>();
}

/** 해당 기능 흐름을 처리 */
function scrollSelectedComponentIntoView() {
  if (selectedReactComponentIndex < 0) return;
  const selector = `.react-component-item[data-component-index="${selectedReactComponentIndex}"]`;
  const activeItem = reactComponentListEl.querySelector<HTMLElement>(selector);
  if (!activeItem) return;
  activeItem.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}

/** 계산/조회 결과를 UI 상태에 반영 */
function applySelectedComponentDetail(result: ReactComponentDetailResult): boolean {
  const appliedResult = applySelectedComponentDetailResultValue({
    result,
    reactComponents,
    componentSearchTexts,
    componentSearchIncludeDataTokens,
    selectedReactComponentIndex,
    patchComponentSearchTextCacheAt: patchComponentSearchTextCacheAtValue,
    renderReactComponentDetail,
  });
  reactComponents = appliedResult.reactComponents;
  return appliedResult.applied;
}

const detailFetchQueue = createReactDetailFetchQueue({
  cooldownMs: DETAIL_FETCH_RETRY_COOLDOWN_MS,
  callInspectedPageAgent,
  getLookup: () => getLookupForRuntimeRefresh(),
  getSelectedComponent: () =>
    selectedReactComponentIndex >= 0 ? reactComponents[selectedReactComponentIndex] : null,
  findComponentById: (componentId) =>
    reactComponents.find((candidate) => candidate.id === componentId),
  applySelectedComponentDetail,
  setReactDetailEmpty,
});

const scheduleScrollSelectedComponentIntoView = () => {
  requestAnimationFrame(() => {
    scrollSelectedComponentIntoView();
  });
};

const selectReactComponent = createReactComponentSelectorValue({
  getReactComponents: () => reactComponents,
  setSelectedComponentIndex: (index) => {
    selectedReactComponentIndex = index;
  },
  clearPageHoverPreview,
  expandAncestorPaths,
  renderReactComponentList,
  scheduleScrollSelectedComponentIntoView,
  renderReactComponentDetail,
  setReactDetailEmpty,
  highlightPageDomForComponent,
  detailFetchQueue,
  detailFetchRetryCooldownMs: DETAIL_FETCH_RETRY_COOLDOWN_MS,
});

/** 이벤트를 처리 */
function onComponentSearchInput() {
  componentSearchQuery = componentSearchInputEl.value;
  handleComponentSearchInputValue({
    componentSearchQuery,
    reactComponents,
    selectedReactComponentIndex,
    getComponentFilterResult,
    applySearchNoResultState: (options) => {
      applySearchNoResultState('searchInput', options);
    },
    expandAncestorPaths,
    selectReactComponent,
    renderReactComponentList,
    setReactStatus,
    buildSearchSummaryStatusText: buildSearchSummaryStatusTextValue,
  });
}

/** 해당 기능 흐름을 처리 */
function resetReactInspector(statusText: string, isError = false) {
  reactComponents = [];
  componentSearchTexts = [];
  componentSearchIncludeDataTokens = true;
  collapsedComponentIds = new Set<string>();
  updatedComponentIds = new Set<string>();
  detailFetchQueue.reset();
  selectedReactComponentIndex = -1;
  lastReactListRenderSignature = '';
  lastReactDetailRenderSignature = '';
  lastReactDetailComponentId = null;
  clearPageHoverPreview();
  clearPageComponentHighlight();
  applyReactInspectorPaneStateValue(
    reactInspectorPaneSetters,
    buildReactInspectorResetPaneStateValue(statusText, isError),
  );
}

const applyReactInspectResult = createReactInspectResultApplyFlowValue({
  readState: () => ({
    reactComponents,
    selectedReactComponentIndex,
    collapsedComponentIds,
  }),
  writeState: (update) => {
    if (update.reactComponents) {
      reactComponents = update.reactComponents;
    }
    if (update.updatedComponentIds) {
      updatedComponentIds = update.updatedComponentIds;
    }
    if (typeof update.componentSearchIncludeDataTokens === 'boolean') {
      componentSearchIncludeDataTokens = update.componentSearchIncludeDataTokens;
    }
    if (update.componentSearchTexts) {
      componentSearchTexts = update.componentSearchTexts;
    }
    if (update.collapsedComponentIds) {
      collapsedComponentIds = update.collapsedComponentIds;
    }
    if (typeof update.selectedReactComponentIndex === 'number') {
      selectedReactComponentIndex = update.selectedReactComponentIndex;
    }
  },
  getComponentFilterResult,
  setReactStatus,
  renderReactComponentList,
  selectReactComponent,
  applySearchNoResultState: (context) => {
    applySearchNoResultState(context);
  },
  resetReactInspector,
});

const { fetchReactInfo } = createReactInspectFetchFlowValue({
  callInspectedPageAgent,
  getStoredLookup: () => lastReactLookup,
  setStoredLookup: (lookup) => {
    lastReactLookup = lookup;
  },
  getReactComponents: () => reactComponents,
  getSelectedReactComponentIndex: () => selectedReactComponentIndex,
  clearPageHoverPreview,
  clearPageComponentHighlight,
  applyLoadingPaneState: () => {
    applyReactInspectorPaneStateValue(
      reactInspectorPaneSetters,
      buildReactInspectorLoadingPaneStateValue(),
    );
  },
  resetReactInspector,
  applyReactInspectResult,
});

/** 필요한 값/상태를 계산해 반환 */
function getLookupForRuntimeRefresh(): RuntimeRefreshLookup {
  return resolveRuntimeRefreshLookupValue(lastReactLookup);
}

const runtimeRefreshScheduler = createRuntimeRefreshScheduler({
  minIntervalMs: 1200,
  debounceMs: 250,
  isPickerModeActive: () => pickerModeActive,
  getLookup: () => getLookupForRuntimeRefresh(),
  runRefresh: (lookup, background, onDone) => {
    fetchReactInfo(
      lookup.selector,
      lookup.pickPoint,
      createRuntimeRefreshFetchOptionsValue(background, onDone),
    );
  },
});

/** 이벤트를 처리 */
function onInspectedPageNavigated(url: string) {
  lastReactLookup = null;
  runtimeRefreshScheduler.reset();
  setElementOutput(`페이지 이동 감지: ${url}`);
  setDomTreeStatus('페이지 변경 감지됨. 요소를 선택하면 DOM 트리를 표시합니다.');
  setDomTreeEmpty('요소를 선택하면 DOM 트리를 표시합니다.');
  runtimeRefreshScheduler.refresh(false);
}

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

chrome.runtime.onMessage.addListener(onRuntimeMessage);

function onPanelBeforeUnload() {
  workspaceLayoutManager?.destroy();
  workspaceLayoutManager = null;
  if (destroyWheelScrollFallback) {
    destroyWheelScrollFallback();
    destroyWheelScrollFallback = null;
  }
  runtimeRefreshScheduler.dispose();
  chrome.devtools.network.onNavigated.removeListener(onInspectedPageNavigated);
}

const { bootstrapPanel } = createPanelBootstrapFlowValue({
  mountPanelView,
  initDomRefs,
  initializeWorkspaceLayout: () => {
    workspaceLayoutManager = createWorkspaceLayoutManager({
      panelContentEl,
      workspacePanelToggleBarEl,
      workspaceDockPreviewEl,
      workspacePanelElements,
    });
  },
  initializeWheelFallback: () => {
    destroyWheelScrollFallback = initWheelScrollFallback(panelWorkspaceEl);
  },
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

/** 화면 요소를 렌더링 */
function renderPanelFatalError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  document.body.innerHTML = '';

  const container = document.createElement('div');
  container.style.padding = '12px';
  container.style.fontFamily = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
  container.style.whiteSpace = 'pre-wrap';
  container.style.color = '#ffd7d7';
  container.style.background = '#3a1f27';
  container.style.border = '1px solid #8d3b4a';
  container.style.borderRadius = '6px';
  container.textContent = `EC Dev Tool panel 초기화 실패\\n\\n${message}`;
  document.body.appendChild(container);
}

/** 엔트리 실행을 시작 */
export function runPanel() {
  try {
    bootstrapPanel();
  } catch (error) {
    console.error('[EC Dev Tool] panel bootstrap failed', error);
    renderPanelFatalError(error);
  }
}
