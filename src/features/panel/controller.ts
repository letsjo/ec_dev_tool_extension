/**
 * DevTools Panel 핵심 컨트롤러.
 *
 * 흐름 요약:
 * 1. PanelViewSection(정적 골격)를 마운트하고 DOM 참조를 연결한다.
 * 2. background/content/pageAgent와 통신해 React/DOM 데이터를 조회한다.
 * 3. Components Tree, Inspector, Selected Element/DOM Path/DOM Tree, Raw Result를 렌더링한다.
 * 4. 스플릿/검색/선택/하이라이트/런타임 갱신 상태를 동기화한다.
 */
import React from 'react';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { TARGETS } from '../../config';
import {
  isPickPoint,
  isReactInspectResult,
  isRecord,
} from '../../shared/inspector/guards';
import { readString } from '../../shared/readers/string';
import type {
  ComponentFilterResult,
  DomTreeEvalResult,
  ElementSelectedMessage,
  JsonPathSegment,
  JsonSectionKind,
  PickPoint,
  PickerStartResponse,
  ReactComponentDetailResult,
  ReactComponentInfo,
  ReactInspectResult,
} from '../../shared/inspector/types';
import { PanelViewSection } from '../../ui/sections';
import { WORKSPACE_PANEL_IDS, type WorkspacePanelId } from './workspacePanels';
import {
  createWorkspaceLayoutManager,
  type WorkspaceLayoutManager,
} from './workspace/manager';
import { initWheelScrollFallback } from './workspace/wheelScrollFallback';
import {
  buildReactComponentDetailRenderSignature as buildReactComponentDetailRenderSignatureValue,
  buildReactComponentUpdateFingerprint as buildReactComponentUpdateFingerprintValue,
  buildReactListRenderSignature as buildReactListRenderSignatureValue,
} from './reactInspector/signatures';
import {
  buildComponentIndexById as buildComponentIndexByIdValue,
  buildComponentSearchText as buildComponentSearchTextValue,
  expandAncestorPaths as expandAncestorPathsValue,
  getComponentFilterResult as getComponentFilterResultValue,
  restoreCollapsedById as restoreCollapsedByIdValue,
  snapshotCollapsedIds as snapshotCollapsedIdsValue,
} from './reactInspector/search';
import { createReactJsonSection as createReactJsonSectionValue } from './reactInspector/jsonSection';
import { createReactDetailFetchQueue } from './reactInspector/detailFetchQueue';
import { renderDomTreeNode } from './domTree/renderer';
import { callInspectedPageAgent } from './bridge/pageAgentClient';
import {
  handleDomTreeAgentResponse,
  handleReactInspectAgentResponse,
} from './pageAgent/responsePipeline';
import { createPanelSelectionSyncHandlers } from './pageAgent/selectionSync';
import { createRuntimeRefreshScheduler } from './runtimeRefresh/scheduler';

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

interface SelectReactComponentOptions {
  highlightDom?: boolean;
  scrollIntoView?: boolean;
  expandAncestors?: boolean;
}

interface ApplyReactInspectOptions {
  preserveSelection?: boolean;
  preserveCollapsed?: boolean;
  highlightSelection?: boolean;
  scrollSelectionIntoView?: boolean;
  expandSelectionAncestors?: boolean;
  lightweight?: boolean;
  trackUpdates?: boolean;
  refreshDetail?: boolean;
  statusText?: string;
}

interface FetchReactInfoOptions {
  keepLookup?: boolean;
  background?: boolean;
  preserveSelection?: boolean;
  preserveCollapsed?: boolean;
  highlightSelection?: boolean;
  scrollSelectionIntoView?: boolean;
  expandSelectionAncestors?: boolean;
  lightweight?: boolean;
  serializeSelectedComponent?: boolean;
  trackUpdates?: boolean;
  refreshDetail?: boolean;
  statusText?: string;
  onDone?: () => void;
}

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
const PAGE_FUNCTION_INSPECT_REGISTRY_KEY = '__EC_DEV_TOOL_FUNCTION_INSPECT_REGISTRY__';

let destroyWheelScrollFallback: (() => void) | null = null;
let workspacePanelElements = new Map<WorkspacePanelId, HTMLDetailsElement>();
let workspaceLayoutManager: WorkspaceLayoutManager | null = null;

function getRequiredElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`필수 엘리먼트를 찾을 수 없습니다: #${id}`);
  }
  return element as T;
}

/**
 * 현재 DOM에 렌더된 패널 `<details>`를 id 기준으로 수집한다.
 * 이후 레이아웃 렌더/상태 전환/크기 동기화는 이 맵을 단일 진입점으로 사용한다.
 */
function collectWorkspacePanelElements(): Map<WorkspacePanelId, HTMLDetailsElement> {
  const panelEntries = WORKSPACE_PANEL_IDS.map(
    (panelId) => [panelId, getRequiredElement<HTMLDetailsElement>(panelId)] as const,
  );
  return new Map<WorkspacePanelId, HTMLDetailsElement>(panelEntries);
}

/**
 * React 패널 뷰를 1회 마운트한다.
 * `flushSync`를 쓰는 이유:
 * - 다음 단계(`initDomRefs`)가 바로 DOM query를 수행하므로,
 * - React commit이 완료된 시점을 강제해서 null 참조를 피하기 위해서다.
 */
function mountPanelView() {
  const rootElement = getRequiredElement<HTMLDivElement>('root');
  const root = createRoot(rootElement);
  flushSync(() => {
    root.render(React.createElement(PanelViewSection));
  });
}

/**
 * 패널 동작에 필요한 주요 DOM 참조를 한 곳에서 초기화한다.
 * 이 함수 이후에는 하위 로직이 전역 ref를 신뢰하고 동작하므로,
 * 필수 노드는 `getRequiredElement`로 즉시 실패하게 한다.
 */
function initDomRefs() {
  outputEl = getRequiredElement<HTMLDivElement>('output');
  targetSelectEl = document.getElementById('targetSelect') as HTMLSelectElement | null;
  fetchBtnEl = document.getElementById('fetchBtn') as HTMLButtonElement | null;
  panelWorkspaceEl = getRequiredElement<HTMLElement>('panelWorkspace');
  panelContentEl = getRequiredElement<HTMLElement>('panelContent');
  workspacePanelToggleBarEl = getRequiredElement<HTMLDivElement>('workspacePanelToggleBar');
  workspaceDockPreviewEl = getRequiredElement<HTMLDivElement>('workspaceDockPreview');
  selectElementBtnEl = getRequiredElement<HTMLButtonElement>('selectElementBtn');
  componentSearchInputEl = getRequiredElement<HTMLInputElement>('componentSearchInput');
  elementOutputEl = getRequiredElement<HTMLDivElement>('selectedElementPane');
  domTreeStatusEl = getRequiredElement<HTMLDivElement>('selectedElementPathPane');
  domTreeOutputEl = getRequiredElement<HTMLDivElement>('selectedElementDomPane');
  reactStatusEl = getRequiredElement<HTMLDivElement>('reactStatus');
  reactComponentListEl = getRequiredElement<HTMLDivElement>('reactComponentList');
  treePaneEl = getRequiredElement<HTMLDivElement>('treePane');
  reactComponentDetailEl = getRequiredElement<HTMLDivElement>('reactComponentDetail');
  workspacePanelElements = collectWorkspacePanelElements();
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
  outputEl.textContent = text;
  outputEl.classList.toggle('empty', !text);
  outputEl.classList.toggle('error', isError);
}

/**
 * eval 결과를 JSON으로 직렬화. 순환 참조·함수 등은 문자열로 대체.
 */
/** 해당 기능 흐름을 처리 */
function safeStringify(value: unknown): string {
  const seen = new WeakSet();
  return JSON.stringify(
    value,
    (_, v) => {
      if (v === undefined) return '[undefined]';
      if (typeof v === 'function') return '[Function]';
      if (typeof v === 'symbol') return String(v);
      if (v !== null && typeof v === 'object') {
        if (seen.has(v)) return '[Circular]';
        seen.add(v);
      }
      return v;
    },
    2,
  );
}

/** 화면 요소를 렌더링 */
function renderResult(result: unknown): string {
  if (result == null) return '결과 없음';
  if (typeof result === 'object' && 'error' in result) {
    return `오류: ${(result as { error: string }).error}`;
  }
  return safeStringify(result);
}

/** 선택 목록을 채운 */
function populateTargetSelect() {
  if (!targetSelectEl) return;
  const selectEl = targetSelectEl;
  selectEl.innerHTML = '';
  TARGETS.forEach((t, i) => {
    const opt = document.createElement('option');
    opt.value = String(i);
    opt.textContent = `${t.label} (${t.path})`;
    selectEl.appendChild(opt);
  });
}

/** 이벤트를 처리 */
function onFetch() {
  if (!targetSelectEl || !fetchBtnEl) {
    setOutput('데이터 가져오기 UI가 비활성화되어 있습니다.', true);
    return;
  }
  const selectEl = targetSelectEl;
  const fetchEl = fetchBtnEl;
  const idx = parseInt(selectEl.value, 10);
  const target = TARGETS[idx];
  if (!target) {
    setOutput('대상을 선택해 주세요.', true);
    return;
  }

  fetchEl.disabled = true;
  setOutput('호출 중…');

  callInspectedPageAgent(
    'fetchTargetData',
    {
      targetPath: target.path,
      methods: target.methods ?? [],
      autoDiscoverZeroArgMethods: target.autoDiscoverZeroArgMethods === true,
    },
    (res, errorText) => {
      fetchEl.disabled = false;
      if (errorText) {
        setOutput(`실행 오류: ${errorText}`, true);
        return;
      }
      setOutput(renderResult(res), !!(res && typeof res === 'object' && 'error' in res));
    },
  );
}

/** UI 상태 또는 문구를 설정 */
function setPaneText(targetEl: HTMLDivElement, text: string) {
  targetEl.textContent = text;
  targetEl.classList.toggle('empty', !text);
}

/** UI 상태 또는 문구를 설정 */
function setPaneTextWithErrorState(targetEl: HTMLDivElement, text: string, isError: boolean) {
  setPaneText(targetEl, text);
  targetEl.classList.toggle('error', isError);
}

/** UI 상태 또는 문구를 설정 */
function setElementOutput(text: string) {
  setPaneText(elementOutputEl, text);
}

/** UI 상태 또는 문구를 설정 */
function setReactStatus(text: string, isError = false) {
  reactStatusEl.textContent = text;
  reactStatusEl.classList.toggle('empty', !text);
  reactStatusEl.classList.toggle('error', isError);
}

/** UI 상태 또는 문구를 설정 */
function setReactListEmpty(text: string) {
  lastReactListRenderSignature = `__empty__:${text}`;
  reactComponentListEl.textContent = text;
  reactComponentListEl.classList.add('empty');
}

/** UI 상태 또는 문구를 설정 */
function setReactDetailEmpty(text: string) {
  lastReactDetailRenderSignature = `__empty__:${text}`;
  lastReactDetailComponentId = null;
  reactComponentDetailEl.textContent = text;
  reactComponentDetailEl.classList.add('empty');
}

/** UI 상태 또는 문구를 설정 */
function setDomTreeStatus(text: string, isError = false) {
  setPaneTextWithErrorState(domTreeStatusEl, text, isError);
}

/** UI 상태 또는 문구를 설정 */
function setDomTreeEmpty(text: string) {
  setPaneText(domTreeOutputEl, text);
}

/** 기존 상태를 정리 */
function clearDomTreeOutput() {
  domTreeOutputEl.innerHTML = '';
  domTreeOutputEl.classList.remove('empty');
}

/** 기존 상태를 정리 */
function clearElement(element: HTMLElement) {
  element.innerHTML = '';
}

/**
 * page-agent에서 반환한 DOM 트리 결과를 UI에 반영한다.
 * - root가 없으면 상태/본문 모두 에러/empty로 정리
 * - root가 있으면 기존 DOM 트리 내용을 비우고 새 노드만 렌더
 * - 메타의 truncation 여부를 status suffix로 함께 노출
 */
function applyDomTreeResult(result: DomTreeEvalResult) {
  if (!result.root) {
    setDomTreeStatus('DOM 트리를 생성하지 못했습니다.', true);
    setDomTreeEmpty('표시할 DOM이 없습니다.');
    return;
  }

  clearDomTreeOutput();
  domTreeOutputEl.appendChild(renderDomTreeNode(result.root));

  const rawMeta = (result as unknown as Record<string, unknown>).meta;
  const meta = isRecord(rawMeta) ? rawMeta : null;
  const truncatedByBudget = Boolean(meta && meta.truncatedByBudget === true);
  const pathText = typeof result.domPath === 'string' ? result.domPath : '';
  const suffix = truncatedByBudget ? ' (노드가 많아 일부 생략됨)' : '';
  setDomTreeStatus(pathText ? `DOM path: ${pathText}${suffix}` : `선택 요소 DOM${suffix}`);
}

/**
 * 선택된 selector(또는 clickPoint)를 기준으로 DOM 트리를 조회한다.
 * 조회 시작/성공/실패 상태를 항상 이 함수에서 통일해 UI 일관성을 유지한다.
 */
function fetchDomTree(selector: string, pickPoint?: PickPoint) {
  setDomTreeStatus('DOM 트리 조회 중…');
  setDomTreeEmpty('DOM 트리를 불러오는 중…');

  callInspectedPageAgent(
    'getDomTree',
    { selector, pickPoint: pickPoint ?? null },
    (res, errorText) => {
      handleDomTreeAgentResponse({
        response: res,
        errorText: errorText ?? undefined,
        setDomTreeStatus,
        setDomTreeEmpty,
        applyDomTreeResult,
      });
    },
  );
}

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

/** 경로 기준 inspect 동작을 수행 */
function inspectFunctionAtPath(
  component: ReactComponentInfo,
  section: JsonSectionKind,
  path: JsonPathSegment[],
) {
  setReactStatus('함수 이동 시도 중…');
  callInspectedPageAgent(
    'reactInspectPath',
    {
      componentId: component.id,
      selector: component.domSelector ?? lastReactLookup?.selector ?? '',
      pickPoint: component.domSelector ? null : (lastReactLookup?.pickPoint ?? null),
      section,
      path,
      mode: 'inspectFunction',
    },
    (res, errorText) => {
      if (errorText) {
        setReactStatus(`함수 이동 실행 오류: ${errorText}`, true);
        return;
      }
      if (!isRecord(res) || res.ok !== true) {
        const reason = isRecord(res) ? String(res.error ?? '알 수 없는 오류') : '알 수 없는 오류';
        setReactStatus(`함수 이동 실패: ${reason}`, true);
        return;
      }
      const name = typeof res.name === 'string' ? res.name : '(anonymous)';
      const inspectRefKey = typeof res.inspectRefKey === 'string' ? res.inspectRefKey : '';
      if (!inspectRefKey) {
        setReactStatus('함수 이동 실패: inspect reference를 찾지 못했습니다.', true);
        return;
      }
      openFunctionInSources(inspectRefKey, name);
    },
  );
}

/** DevTools 기능을 호출해 이동/열기를 수행 */
function openFunctionInSources(inspectRefKey: string, functionName: string) {
  const storeKeyLiteral = JSON.stringify(PAGE_FUNCTION_INSPECT_REGISTRY_KEY);
  const refKeyLiteral = JSON.stringify(inspectRefKey);
  const expression = `(function(){try{const store=window[${storeKeyLiteral}];const fn=store&&store[${refKeyLiteral}];if(typeof fn!=="function"){return {ok:false,error:"inspect 대상 함수를 찾지 못했습니다."};}if(typeof inspect!=="function"){return {ok:false,error:"DevTools inspect 함수를 사용할 수 없습니다."};}inspect(fn);return {ok:true};}catch(error){return {ok:false,error:String(error&&error.message?error.message:error)};}})();`;

  chrome.devtools.inspectedWindow.eval(expression, (result, exceptionInfo) => {
    if (chrome.runtime.lastError) {
      setReactStatus(`함수 이동 실패: ${chrome.runtime.lastError.message ?? '실행 오류'}`, true);
      return;
    }
    if (exceptionInfo && (exceptionInfo as { isException?: boolean }).isException) {
      const description =
        (exceptionInfo as { description?: string }).description ?? '예외가 발생했습니다.';
      setReactStatus(`함수 이동 실패: ${description}`, true);
      return;
    }
    if (!isRecord(result) || result.ok !== true) {
      const reason = isRecord(result)
        ? String(result.error ?? '알 수 없는 오류')
        : '알 수 없는 오류';
      setReactStatus(`함수 이동 실패: ${reason}`, true);
      return;
    }
    setReactStatus(`함수 ${functionName} 위치로 이동했습니다.`);
  });
}

/** 페이지/런타임 데이터를 조회 */
function fetchSerializedValueAtPath(
  component: ReactComponentInfo,
  section: JsonSectionKind,
  path: JsonPathSegment[],
  onDone: (value: unknown | null) => void,
) {
  callInspectedPageAgent(
    'reactInspectPath',
    {
      componentId: component.id,
      selector: component.domSelector ?? lastReactLookup?.selector ?? '',
      pickPoint: component.domSelector ? null : (lastReactLookup?.pickPoint ?? null),
      section,
      path,
      mode: 'serializeValue',
      serializeLimit: 45000,
    },
    (res, errorText) => {
      if (errorText) {
        onDone(null);
        return;
      }
      if (!isRecord(res) || res.ok !== true) {
        onDone(null);
        return;
      }
      onDone('value' in res ? (res as { value: unknown }).value : null);
    },
  );
}

/** 파생 데이터나 요약 값을 구성 */
function buildReactComponentDetailRenderSignature(component: ReactComponentInfo): string {
  return buildReactComponentDetailRenderSignatureValue(component);
}

/** 파생 데이터나 요약 값을 구성 */
function buildReactComponentUpdateFingerprint(
  component: ReactComponentInfo,
  metadataOnly = false,
): string {
  return buildReactComponentUpdateFingerprintValue(component, metadataOnly);
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

/** 파생 데이터나 요약 값을 구성 */
function buildComponentSearchText(component: ReactComponentInfo, includeDataTokens = true): string {
  return buildComponentSearchTextValue(component, includeDataTokens);
}

/** 필요한 값/상태를 계산해 반환 */
function getComponentFilterResult(): ComponentFilterResult {
  if (componentSearchQuery.trim() && componentSearchTexts.length !== reactComponents.length) {
    componentSearchTexts = reactComponents.map((component) =>
      buildComponentSearchText(component, componentSearchIncludeDataTokens),
    );
  }
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

/** 현재 상태 스냅샷을 만든 */
function snapshotCollapsedIds(): Set<string> {
  return snapshotCollapsedIdsValue(reactComponents, collapsedComponentIds);
}

/** 이전 상태를 복원 */
function restoreCollapsedById(ids: ReadonlySet<string>) {
  collapsedComponentIds = restoreCollapsedByIdValue(reactComponents, ids);
}

/** 화면 요소를 렌더링 */
function renderReactComponentDetail(component: ReactComponentInfo) {
  const nextSignature = buildReactComponentDetailRenderSignature(component);
  if (
    component.id === lastReactDetailComponentId &&
    nextSignature === lastReactDetailRenderSignature
  ) {
    return;
  }

  clearElement(reactComponentDetailEl);
  reactComponentDetailEl.classList.remove('empty');

  const content = document.createElement('div');
  content.className = 'react-component-detail-content';

  const title = document.createElement('div');
  title.className = 'react-detail-title';
  title.textContent = component.name;
  content.appendChild(title);

  const meta = document.createElement('div');
  meta.className = 'react-detail-meta';
  meta.textContent = `kind: ${component.kind} | hook count: ${component.hookCount}`;
  content.appendChild(meta);

  content.appendChild(createJsonSection('props', component.props, component, 'props'));
  content.appendChild(createJsonSection('hooks', component.hooks, component, 'hooks'));
  reactComponentDetailEl.appendChild(content);
  lastReactDetailComponentId = component.id;
  lastReactDetailRenderSignature = nextSignature;
}

/** 화면 요소를 렌더링 */
function renderReactComponentList() {
  if (reactComponents.length === 0) {
    setReactListEmpty('컴포넌트 목록이 없습니다.');
    return;
  }

  const filterResult = getComponentFilterResult();
  const visibleIndices = filterResult.visibleIndices;
  const matchedIndexSet = new Set<number>(filterResult.matchedIndices);

  if (visibleIndices.length === 0) {
    const suffix = componentSearchQuery.trim() ? `: "${componentSearchQuery.trim()}"` : '';
    setReactListEmpty(`검색 결과가 없습니다${suffix}`);
    return;
  }

  const nextSignature = buildReactListRenderSignature(filterResult, matchedIndexSet);
  const forceRenderForUpdates = updatedComponentIds.size > 0;
  if (nextSignature === lastReactListRenderSignature && !forceRenderForUpdates) {
    return;
  }

  const previousScrollTop = treePaneEl.scrollTop;
  const previousScrollLeft = treePaneEl.scrollLeft;
  const selectedItemSelector =
    selectedReactComponentIndex >= 0
      ? `.react-component-item[data-component-index="${selectedReactComponentIndex}"]`
      : '';
  const previousSelectedItem = selectedItemSelector
    ? reactComponentListEl.querySelector<HTMLElement>(selectedItemSelector)
    : null;
  const previousContainerTop = treePaneEl.getBoundingClientRect().top;
  const previousSelectedOffsetTop = previousSelectedItem
    ? previousSelectedItem.getBoundingClientRect().top - previousContainerTop
    : null;

  const visibleSet = new Set<number>(visibleIndices);
  const idToIndex = buildComponentIndexById();
  const childrenByParent = new Map<string | null, number[]>();

  const pushChild = (parentId: string | null, index: number) => {
    const list = childrenByParent.get(parentId) ?? [];
    list.push(index);
    childrenByParent.set(parentId, list);
  };

  visibleIndices.forEach((index) => {
    const component = reactComponents[index];
    const parentId = component.parentId;
    if (!parentId) {
      pushChild(null, index);
      return;
    }
    const parentIndex = idToIndex.get(parentId);
    if (parentIndex === undefined || !visibleSet.has(parentIndex)) {
      pushChild(null, index);
      return;
    }
    pushChild(parentId, index);
  });

  clearElement(reactComponentListEl);
  reactComponentListEl.classList.remove('empty');

  const renderTreeNode = (index: number) => {
    const component = reactComponents[index];
    const isActive = index === selectedReactComponentIndex;
    const isSearchMatch = componentSearchQuery.trim().length > 0 && matchedIndexSet.has(index);
    const isUpdated = updatedComponentIds.has(component.id);
    const childIndices = childrenByParent.get(component.id) ?? [];
    const hasChildren = childIndices.length > 0;
    const isCollapsed = hasChildren && collapsedComponentIds.has(component.id);

    const row = document.createElement('div');
    row.className = 'react-tree-row';
    row.style.paddingLeft = `${6 + component.depth * 12}px`;

    if (hasChildren) {
      const toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'react-tree-toggle';
      toggle.textContent = isCollapsed ? '▸' : '▾';
      toggle.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (collapsedComponentIds.has(component.id)) {
          collapsedComponentIds.delete(component.id);
        } else {
          collapsedComponentIds.add(component.id);
        }
        renderReactComponentList();
      });
      row.appendChild(toggle);
    } else {
      const spacer = document.createElement('span');
      spacer.className = 'react-tree-spacer';
      spacer.textContent = ' ';
      row.appendChild(spacer);
    }

    const item = document.createElement('button');
    item.type = 'button';
    item.dataset.componentIndex = String(index);
    item.className =
      'react-component-item' +
      (isActive ? ' active' : '') +
      (isSearchMatch ? ' search-match' : '') +
      (isUpdated ? ' updated-flash' : '');
    const domBadge = component.domSelector ? ' [DOM]' : ' [No DOM]';
    item.textContent =
      `${component.name} · ${component.kind}${domBadge}` +
      (index === selectedReactComponentIndex ? ' (selected)' : '');
    item.addEventListener('mouseenter', () => {
      previewPageDomForComponent(component);
    });
    item.addEventListener('mouseleave', () => {
      clearPageHoverPreview();
    });
    item.addEventListener('focus', () => {
      previewPageDomForComponent(component);
    });
    item.addEventListener('blur', () => {
      clearPageHoverPreview();
    });
    item.addEventListener('click', () => {
      selectReactComponent(index);
    });
    row.appendChild(item);
    reactComponentListEl.appendChild(row);

    if (!isCollapsed) {
      childIndices.forEach((childIndex) => {
        renderTreeNode(childIndex);
      });
    }
  };

  const rootIndices = childrenByParent.get(null) ?? [];
  rootIndices.forEach((index) => renderTreeNode(index));

  if (previousSelectedOffsetTop !== null && selectedItemSelector) {
    const nextSelectedItem = reactComponentListEl.querySelector<HTMLElement>(selectedItemSelector);
    if (nextSelectedItem) {
      const nextContainerTop = treePaneEl.getBoundingClientRect().top;
      const nextSelectedOffsetTop = nextSelectedItem.getBoundingClientRect().top - nextContainerTop;
      treePaneEl.scrollTop += nextSelectedOffsetTop - previousSelectedOffsetTop;
    } else {
      treePaneEl.scrollTop = previousScrollTop;
    }
  } else {
    treePaneEl.scrollTop = previousScrollTop;
  }
  treePaneEl.scrollLeft = previousScrollLeft;

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
  if (!result.ok || typeof result.componentId !== 'string') return false;

  const componentIndex = reactComponents.findIndex(
    (component) => component.id === result.componentId,
  );
  if (componentIndex < 0) return false;

  const previous = reactComponents[componentIndex];
  const next: ReactComponentInfo = {
    ...previous,
    props: result.props,
    hooks: result.hooks,
    hookCount: typeof result.hookCount === 'number' ? result.hookCount : previous.hookCount,
    hasSerializedData: true,
  };
  reactComponents[componentIndex] = next;

  if (componentSearchTexts.length === reactComponents.length && componentSearchIncludeDataTokens) {
    componentSearchTexts[componentIndex] = buildComponentSearchText(next, true);
  }

  if (selectedReactComponentIndex === componentIndex) {
    renderReactComponentDetail(next);
  }
  return true;
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

/** 선택 상태를 갱신 */
function selectReactComponent(index: number, options: SelectReactComponentOptions = {}) {
  if (index < 0 || index >= reactComponents.length) return;
  const highlightDom = options.highlightDom !== false;
  const shouldScroll = options.scrollIntoView !== false;
  const shouldExpandAncestors = options.expandAncestors !== false;

  clearPageHoverPreview();
  selectedReactComponentIndex = index;
  if (shouldExpandAncestors) {
    expandAncestorPaths([index]);
  }
  renderReactComponentList();
  if (shouldScroll) {
    requestAnimationFrame(() => {
      scrollSelectedComponentIntoView();
    });
  }
  const component = reactComponents[index];
  if (component.hasSerializedData === false) {
    const lastFailedAt = detailFetchQueue.getLastFailedAt(component.id);
    if (lastFailedAt && Date.now() - lastFailedAt < DETAIL_FETCH_RETRY_COOLDOWN_MS) {
      setReactDetailEmpty('상세 정보가 커서 지연됩니다. 잠시 후 다시 선택하세요.');
    } else {
      setReactDetailEmpty('컴포넌트 상세 정보 조회 중…');
      detailFetchQueue.request(component);
    }
  } else {
    renderReactComponentDetail(component);
  }
  if (highlightDom) {
    highlightPageDomForComponent(component);
  }
}

/** 이벤트를 처리 */
function onComponentSearchInput() {
  componentSearchQuery = componentSearchInputEl.value;

  if (reactComponents.length === 0) {
    renderReactComponentList();
    return;
  }

  const filterResult = getComponentFilterResult();
  if (filterResult.visibleIndices.length === 0) {
    renderReactComponentList();
    setReactDetailEmpty('검색 결과가 없습니다.');
    setReactStatus(`검색 결과가 없습니다. (총 ${reactComponents.length}개)`, true);
    clearPageHoverPreview();
    clearPageComponentHighlight();
    setDomTreeStatus('검색 조건과 일치하는 컴포넌트가 없습니다.', true);
    setDomTreeEmpty('표시할 DOM이 없습니다.');
    return;
  }

  if (componentSearchQuery.trim()) {
    expandAncestorPaths(filterResult.matchedIndices);
  }

  if (!filterResult.visibleIndices.includes(selectedReactComponentIndex)) {
    const nextIndex = filterResult.matchedIndices[0] ?? filterResult.visibleIndices[0];
    selectReactComponent(nextIndex);
    return;
  }

  renderReactComponentList();
  setReactStatus(
    `검색 매치 ${filterResult.matchedIndices.length}개 / 표시 ${filterResult.visibleIndices.length}개 / 전체 ${reactComponents.length}개`,
  );
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
  setReactStatus(statusText, isError);
  setReactListEmpty('컴포넌트 목록이 여기에 표시됩니다.');
  setReactDetailEmpty('컴포넌트를 선택하면 props/hooks를 표시합니다.');
}

/**
 * React inspect 응답을 상태/리스트/선택/상세 패널에 반영하는 핵심 파이프라인.
 *
 * 큰 흐름:
 * 1) 이전 선택/접힘/지문(fingerprint) 스냅샷
 * 2) 신규 컴포넌트 배열 정규화(경량 모드면 기존 props/hooks 재사용)
 * 3) 변경 감지 집합(updatedComponentIds) 계산
 * 4) 검색 필터 기준으로 유효한 선택 인덱스 재결정
 * 5) 필요 시 선택 컴포넌트 상세/하이라이트를 갱신
 */
function applyReactInspectResult(
  result: ReactInspectResult,
  options: ApplyReactInspectOptions = {},
) {
  const preserveSelection = options.preserveSelection === true;
  const preserveCollapsed = options.preserveCollapsed === true;
  const highlightSelection = options.highlightSelection !== false;
  const scrollSelectionIntoView = options.scrollSelectionIntoView !== false;
  const expandSelectionAncestors = options.expandSelectionAncestors !== false;
  const lightweight = options.lightweight === true;
  const trackUpdates = options.trackUpdates === true;
  const refreshDetail = options.refreshDetail !== false;

  // preserve 옵션이 켜져 있으면 이전 선택 대상 id를 기준점으로 저장한다.
  const previousSelectedId =
    preserveSelection &&
    selectedReactComponentIndex >= 0 &&
    selectedReactComponentIndex < reactComponents.length
      ? reactComponents[selectedReactComponentIndex].id
      : null;
  const previousCollapsedIds = preserveCollapsed ? snapshotCollapsedIds() : new Set<string>();
  const previousComponentById = new Map<string, ReactComponentInfo>(
    reactComponents.map((component) => [component.id, component]),
  );
  const previousFingerprintById = trackUpdates
    ? new Map<string, string>(
        reactComponents.map((component) => [
          component.id,
          buildReactComponentUpdateFingerprint(component, lightweight),
        ]),
      )
    : null;

  // 경량/전체 모드에 따라 이전 데이터 재사용 여부를 결정해 렌더 비용을 줄인다.
  reactComponents = (Array.isArray(result.components) ? result.components : []).map(
    (component) => ({
      ...(() => {
        const previous = previousComponentById.get(component.id);
        const hasSerializedData = component.hasSerializedData !== false;
        const shouldReusePreviousData = lightweight && !hasSerializedData && Boolean(previous);
        return {
          ...component,
          parentId: component.parentId ?? null,
          props: shouldReusePreviousData ? previous?.props : component.props,
          hooks: shouldReusePreviousData ? previous?.hooks : component.hooks,
          hookCount:
            typeof component.hookCount === 'number'
              ? component.hookCount
              : shouldReusePreviousData
                ? (previous?.hookCount ?? 0)
                : 0,
          hasSerializedData:
            hasSerializedData || (shouldReusePreviousData && previous?.hasSerializedData !== false),
        };
      })(),
    }),
  );
  // 경량 갱신 시 변경된 컴포넌트를 시각적으로 표시하기 위한 id 집합을 만든다.
  updatedComponentIds = new Set<string>();
  if (trackUpdates && previousFingerprintById && previousFingerprintById.size > 0) {
    reactComponents.forEach((component) => {
      const previousFingerprint = previousFingerprintById.get(component.id);
      const nextFingerprint = buildReactComponentUpdateFingerprint(component, lightweight);
      if (previousFingerprint !== nextFingerprint) {
        updatedComponentIds.add(component.id);
      }
    });
  }
  componentSearchIncludeDataTokens = !lightweight;
  componentSearchTexts = reactComponents.map((component) =>
    buildComponentSearchText(component, componentSearchIncludeDataTokens),
  );

  if (preserveCollapsed) {
    restoreCollapsedById(previousCollapsedIds);
  } else {
    collapsedComponentIds = new Set<string>();
  }

  if (reactComponents.length === 0) {
    resetReactInspector('React 컴포넌트를 찾지 못했습니다.', true);
    return;
  }

  let preferredIndex = typeof result.selectedIndex === 'number' ? result.selectedIndex : 0;
  if (previousSelectedId) {
    const preservedIndex = reactComponents.findIndex(
      (component) => component.id === previousSelectedId,
    );
    if (preservedIndex >= 0) {
      preferredIndex = preservedIndex;
    }
  }
  // 필터 결과에 맞춰 선택 인덱스를 다시 계산한다.
  const baseIndex =
    preferredIndex >= 0 && preferredIndex < reactComponents.length ? preferredIndex : 0;
  const filterResult = getComponentFilterResult();
  if (filterResult.visibleIndices.length === 0) {
    selectedReactComponentIndex = -1;
    renderReactComponentList();
    setReactDetailEmpty('검색 결과가 없습니다.');
    setReactStatus(`컴포넌트 ${reactComponents.length}개를 찾았지만 검색 결과가 없습니다.`, true);
    clearPageComponentHighlight();
    setDomTreeStatus('검색 조건과 일치하는 컴포넌트가 없습니다.', true);
    setDomTreeEmpty('표시할 DOM이 없습니다.');
    return;
  }
  selectedReactComponentIndex = filterResult.visibleIndices.includes(baseIndex)
    ? baseIndex
    : (filterResult.matchedIndices[0] ?? filterResult.visibleIndices[0]);

  setReactStatus(
    options.statusText ??
      `컴포넌트 ${reactComponents.length}개를 찾았습니다. 항목을 클릭하면 페이지 DOM과 함께 확인됩니다.`,
  );

  const selectedComponent = reactComponents[selectedReactComponentIndex];
  const selectedId = selectedComponent?.id ?? null;
  const selectedChanged = previousSelectedId !== selectedId;
  if (!refreshDetail && !selectedChanged) {
    renderReactComponentList();
    return;
  }

  selectReactComponent(selectedReactComponentIndex, {
    highlightDom: highlightSelection,
    scrollIntoView: scrollSelectionIntoView,
    expandAncestors: expandSelectionAncestors,
  });
}

/**
 * inspected page의 reactInspect를 호출하고 결과를 apply한다.
 * foreground/background, 경량 모드, 선택/접힘 보존 옵션을 모두 이 계층에서 조합한다.
 */
function fetchReactInfo(
  selector: string,
  pickPoint?: PickPoint,
  options: FetchReactInfoOptions = {},
) {
  const background = options.background === true;
  const lightweight = options.lightweight === true;
  const finish = () => {
    options.onDone?.();
  };

  clearPageHoverPreview();
  if (!background) {
    clearPageComponentHighlight();
  }
  if (!options.keepLookup) {
    lastReactLookup = { selector, pickPoint };
  }
  // background 새로고침이 아니거나 초기 상태일 때만 로딩 문구를 적극적으로 표시한다.
  if (!background || reactComponents.length === 0) {
    setReactStatus('React 정보 조회 중…');
    setReactListEmpty('컴포넌트 트리 조회 중…');
    setReactDetailEmpty('조회 중…');
  }

  // 경량 모드에서 선택 컴포넌트만 직렬화하도록 id를 전달해 payload를 줄인다.
  const selectedComponentIdForScript =
    lightweight &&
    options.serializeSelectedComponent === true &&
    selectedReactComponentIndex >= 0 &&
    selectedReactComponentIndex < reactComponents.length
      ? reactComponents[selectedReactComponentIndex].id
      : null;

  callInspectedPageAgent(
    'reactInspect',
    {
      selector,
      pickPoint: pickPoint ?? null,
      includeSerializedData: !lightweight,
      selectedComponentId: selectedComponentIdForScript,
    },
    (res, errorText) => {
      handleReactInspectAgentResponse({
        response: res,
        errorText: errorText ?? undefined,
        applyOptions: {
          preserveSelection: options.preserveSelection,
          preserveCollapsed: options.preserveCollapsed,
          highlightSelection: options.highlightSelection,
          scrollSelectionIntoView: options.scrollSelectionIntoView,
          expandSelectionAncestors: options.expandSelectionAncestors,
          lightweight: options.lightweight,
          trackUpdates: options.trackUpdates,
          refreshDetail: options.refreshDetail,
          statusText: options.statusText,
        },
        resetReactInspector,
        applyReactInspectResult,
      });
      finish();
    },
  );
}

/** 필요한 값/상태를 계산해 반환 */
function getLookupForRuntimeRefresh(): { selector: string; pickPoint?: PickPoint } {
  if (lastReactLookup && (lastReactLookup.selector || lastReactLookup.pickPoint)) {
    return lastReactLookup;
  }
  return { selector: '' };
}

const runtimeRefreshScheduler = createRuntimeRefreshScheduler({
  minIntervalMs: 1200,
  debounceMs: 250,
  isPickerModeActive: () => pickerModeActive,
  getLookup: () => getLookupForRuntimeRefresh(),
  runRefresh: (lookup, background, onDone) => {
    fetchReactInfo(lookup.selector, lookup.pickPoint, {
      keepLookup: true,
      background,
      preserveSelection: true,
      preserveCollapsed: true,
      highlightSelection: false,
      scrollSelectionIntoView: false,
      expandSelectionAncestors: false,
      lightweight: true,
      serializeSelectedComponent: false,
      trackUpdates: true,
      refreshDetail: !background,
      onDone,
    });
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
 * 실제 선택 완료/취소 이벤트는 runtime.onMessage 핸들러에서 이어서 처리된다.
 */
function onSelectElement() {
  clearPageHoverPreview();
  const tabId = chrome.devtools.inspectedWindow.tabId;
  chrome.runtime.sendMessage(
    { action: 'startElementPicker', tabId },
    (response?: PickerStartResponse) => {
      if (chrome.runtime.lastError) {
        setPickerModeActive(false);
        setElementOutput(
          '오류: ' +
            (chrome.runtime.lastError.message ??
              '콘텐츠 스크립트를 불러올 수 없습니다. 페이지를 새로고침한 뒤 다시 시도하세요.'),
        );
        setDomTreeStatus('오류: 요소 선택을 시작할 수 없습니다.', true);
        return;
      }
      if (!response?.ok) {
        setPickerModeActive(false);
        setElementOutput('오류: ' + (response?.error ?? '요소 선택 시작에 실패했습니다.'));
        setDomTreeStatus('오류: 요소 선택 시작에 실패했습니다.', true);
      } else {
        setPickerModeActive(true);
        setElementOutput('페이지에서 요소를 클릭하세요. (취소: Esc)');
        setReactStatus('요소 선택 대기 중… 선택 후 컴포넌트 트리를 조회합니다.');
        setDomTreeStatus('요소 선택 대기 중…');
        setDomTreeEmpty('요소를 클릭하면 DOM 트리를 표시합니다.');
      }
    },
  );
}

/**
 * background/content script에서 오는 패널 동기화 이벤트 진입점.
 * 분기:
 * - elementPickerStopped: 선택 모드 종료 상태 반영
 * - pageRuntimeChanged: 경량 runtime refresh 예약
 * - elementSelected: Selected Element/DOM/React 패널 동시 갱신
 */
chrome.runtime.onMessage.addListener((message: ElementSelectedMessage) => {
  const inspectedTabId = chrome.devtools.inspectedWindow.tabId;
  if (message.action === 'elementPickerStopped' && message.tabId === inspectedTabId) {
    clearPageHoverPreview();
    setPickerModeActive(false);
    if (message.reason === 'cancelled') {
      setReactStatus('요소 선택이 취소되었습니다.');
      setDomTreeStatus('요소 선택이 취소되었습니다.');
    }
    return;
  }

  if (message.action === 'pageRuntimeChanged' && message.tabId === inspectedTabId) {
    runtimeRefreshScheduler.schedule(true);
    return;
  }

  if (
    message.action === 'elementSelected' &&
    message.elementInfo &&
    message.tabId === inspectedTabId
  ) {
    clearPageHoverPreview();
    setPickerModeActive(false);
    const info = message.elementInfo;
    const selectorText = readString(info.selector);
    const domPathText = readString(info.domPath);
    const tagNameText = readString(info.tagName);
    const idText = readString(info.id);
    const classNameText = readString(info.className);
    const innerText = readString(info.innerText);
    const clickPoint = isPickPoint(info.clickPoint) ? info.clickPoint : undefined;

    const lines = [
      `tagName: ${tagNameText}`,
      `selector: ${selectorText}`,
      `domPath: ${domPathText}`,
      idText ? `id: ${idText}` : null,
      classNameText ? `className: ${classNameText}` : null,
      info.rect ? `rect: ${JSON.stringify(info.rect)}` : null,
      innerText ? `innerText: ${innerText.slice(0, 100)}…` : null,
      clickPoint ? `clickPoint: ${JSON.stringify(clickPoint)}` : null,
    ].filter(Boolean);
    setElementOutput(lines.join('\n'));

    fetchDomTree(selectorText || domPathText, clickPoint);
    fetchReactInfo(selectorText || domPathText, clickPoint, {
      lightweight: true,
      serializeSelectedComponent: false,
      refreshDetail: true,
    });
  }
});

/**
 * 패널 부트스트랩 순서:
 * 1) React 뷰 마운트
 * 2) DOM ref/레이아웃 매니저/휠 fallback 초기화
 * 3) UI 기본 문구/이벤트 바인딩
 * 4) 최초 React 런타임 조회 시작
 */
function bootstrapPanel() {
  mountPanelView();
  initDomRefs();
  workspaceLayoutManager = createWorkspaceLayoutManager({
    panelContentEl,
    workspacePanelToggleBarEl,
    workspaceDockPreviewEl,
    workspacePanelElements,
  });
  destroyWheelScrollFallback = initWheelScrollFallback(panelWorkspaceEl);
  setPickerModeActive(false);
  populateTargetSelect();
  setElementOutput('런타임 트리를 자동으로 불러오는 중입니다.');
  setDomTreeStatus('요소를 선택하면 DOM 트리를 표시합니다.');
  setDomTreeEmpty('요소를 선택하면 DOM 트리를 표시합니다.');
  if (fetchBtnEl) {
    fetchBtnEl.addEventListener('click', onFetch);
  }
  selectElementBtnEl.addEventListener('click', onSelectElement);
  componentSearchInputEl.addEventListener('input', onComponentSearchInput);
  reactComponentListEl.addEventListener('mouseleave', () => {
    clearPageHoverPreview();
  });
  chrome.devtools.network.onNavigated.addListener(onInspectedPageNavigated);
  window.addEventListener('beforeunload', () => {
    workspaceLayoutManager?.destroy();
    workspaceLayoutManager = null;
    if (destroyWheelScrollFallback) {
      destroyWheelScrollFallback();
      destroyWheelScrollFallback = null;
    }
    runtimeRefreshScheduler.dispose();
    chrome.devtools.network.onNavigated.removeListener(onInspectedPageNavigated);
  });
  runtimeRefreshScheduler.refresh(false);
}

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
