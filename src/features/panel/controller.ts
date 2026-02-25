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
  isCircularRefToken,
  isDehydratedToken,
  isDomTreeEvalResult,
  isFunctionToken,
  isMapToken,
  isPageHighlightResult,
  isPickPoint,
  isReactInspectResult,
  isRecord,
  isSetToken,
  readObjectRefId,
} from '../../shared/inspector/guards';
import { readString } from '../../shared/readers/string';
import type {
  ComponentFilterResult,
  DomTreeEvalResult,
  DomTreeNode,
  ElementSelectedMessage,
  JsonPathSegment,
  JsonSectionKind,
  PageHighlightResult,
  PickPoint,
  PickerStartResponse,
  ReactComponentDetailResult,
  ReactComponentInfo,
  ReactInspectResult,
} from '../../shared/inspector/types';
import { PanelViewSection } from '../../ui/sections';
import { isWorkspacePanelId, WORKSPACE_PANEL_IDS, type WorkspacePanelId } from './workspacePanels';
import {
  appendPanelToWorkspaceLayout,
  clampWorkspaceSplitRatio,
  collectPanelIdsFromLayout,
  createDefaultWorkspaceLayout,
  createWorkspacePanelNode,
  createWorkspaceSplitNode,
  dedupeWorkspaceLayoutPanels,
  getWorkspaceVisiblePanelIds,
  insertPanelByDockTarget,
  parseWorkspaceLayoutNode,
  parseWorkspaceNodePath,
  pruneWorkspaceLayoutByVisiblePanels,
  removePanelFromWorkspaceLayout,
  stringifyWorkspaceNodePath,
  swapWorkspaceLayoutPanels,
  updateWorkspaceSplitRatioByPath,
  WORKSPACE_DOCK_SPLIT_RATIO,
  type WorkspaceDockDirection,
  type WorkspaceDropTarget,
  type WorkspaceLayoutNode,
  type WorkspaceNodePath,
  type WorkspacePanelState,
} from './workspace/layoutModel';
import { readStoredJson, writeStoredJson } from './workspace/storage';
import { initWheelScrollFallback } from './workspace/wheelScrollFallback';

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

interface JsonRenderContext {
  component: ReactComponentInfo;
  section: JsonSectionKind;
  path: JsonPathSegment[];
  refMap: Map<number, unknown>;
  refStack: number[];
  allowInspect: boolean;
}

interface HookRowItem {
  sourceIndex: number;
  order: number;
  name: string;
  group: string | null;
  groupPath: string[] | null;
  badge: HookBadgeType | null;
  state: unknown;
}

interface HookGroupTreeNode {
  type: 'group';
  title: string;
  children: HookTreeNode[];
}

interface HookItemTreeNode {
  type: 'item';
  item: HookRowItem;
}

type HookTreeNode = HookGroupTreeNode | HookItemTreeNode;

type HookBadgeType = 'effect' | 'function';

const INLINE_CHILD_INDENT_PX = 16;

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

interface CallPageAgentResponse {
  ok: boolean;
  result?: unknown;
  error?: string;
}

interface WorkspaceResizeDragState {
  splitPath: WorkspaceNodePath;
  axis: 'row' | 'column';
  splitEl: HTMLElement;
  splitRect: DOMRect;
  dividerSize: number;
  ratio: number;
}

let reactComponents: ReactComponentInfo[] = [];
let selectedReactComponentIndex = -1;
let lastReactLookup: { selector: string; pickPoint?: PickPoint } | null = null;
let componentSearchQuery = '';
let pickerModeActive = false;
let componentSearchTexts: string[] = [];
let componentSearchIncludeDataTokens = true;
let collapsedComponentIds = new Set<string>();
let runtimeRefreshInFlight = false;
let runtimeRefreshQueued = false;
let runtimeRefreshTimer: number | null = null;
let runtimeLastRefreshAt = 0;
let lastReactListRenderSignature = '';
let lastReactDetailRenderSignature = '';
let lastReactDetailComponentId: string | null = null;
let updatedComponentIds = new Set<string>();
let detailFetchInFlight = false;
let detailFetchQueuedComponentId: string | null = null;
let detailFetchLastFailedAtById = new Map<string, number>();

const RUNTIME_REFRESH_MIN_INTERVAL_MS = 1200;
const RUNTIME_REFRESH_DEBOUNCE_MS = 250;
const DETAIL_FETCH_RETRY_COOLDOWN_MS = 2500;
const PAGE_FUNCTION_INSPECT_REGISTRY_KEY = '__EC_DEV_TOOL_FUNCTION_INSPECT_REGISTRY__';
const MAP_ENTRY_PATH_SEGMENT_PREFIX = '__ec_map_entry__';
const SET_ENTRY_PATH_SEGMENT_PREFIX = '__ec_set_entry__';
const DISPLAY_PATH_MAP_KEY = '__ecDisplayPathMap';
const DISPLAY_COLLECTION_TYPE_KEY = '__ecDisplayCollectionType';
const DISPLAY_COLLECTION_SIZE_KEY = '__ecDisplayCollectionSize';
const OBJECT_CLASS_NAME_META_KEY = '__ecObjectClassName';
const WORKSPACE_LAYOUT_STORAGE_KEY = 'ecDevTool.workspaceLayout.v1';
const WORKSPACE_PANEL_STATE_STORAGE_KEY = 'ecDevTool.workspacePanelState.v1';

let destroyWheelScrollFallback: (() => void) | null = null;
let workspacePanelElements = new Map<WorkspacePanelId, HTMLDetailsElement>();
let workspaceLayoutRoot: WorkspaceLayoutNode | null = null;
let workspaceDragPanelId: WorkspacePanelId | null = null;
let workspaceDropTarget: WorkspaceDropTarget | null = null;
let workspacePanelStateById = new Map<WorkspacePanelId, WorkspacePanelState>();
let workspaceResizeDragState: WorkspaceResizeDragState | null = null;
let workspacePanelBodySizeObserver: ResizeObserver | null = null;

const BUILTIN_HOOK_NAME_SET = new Set([
  'State',
  'Reducer',
  'Effect',
  'LayoutEffect',
  'InsertionEffect',
  'ImperativeHandle',
  'Memo',
  'Callback',
  'Ref',
  'DeferredValue',
  'Transition',
  'SyncExternalStore',
  'Id',
  'DebugValue',
  'ClassState',
  'Truncated',
  'Hook',
]);

const EFFECT_HOOK_NAME_SET = new Set([
  'Effect',
  'LayoutEffect',
  'InsertionEffect',
  'ImperativeHandle',
  'EffectEvent',
]);

const FUNCTION_HOOK_NAME_SET = new Set(['Callback', 'Memo']);

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

/**
 * DevTools 패널 → background → inspected page agent 호출 공통 래퍼.
 * 모든 호출에서 동일한 에러 처리 규칙을 강제해 UI 상태 분기를 단순화한다.
 */
function callInspectedPageAgent(
  method: string,
  args: unknown,
  onDone: (result: unknown | null, errorText?: string) => void,
) {
  const tabId = chrome.devtools.inspectedWindow.tabId;
  chrome.runtime.sendMessage(
    {
      action: 'callPageAgent',
      tabId,
      method,
      args,
    },
    (response?: CallPageAgentResponse) => {
      if (chrome.runtime.lastError) {
        onDone(null, chrome.runtime.lastError.message ?? '페이지 에이전트 호출 실패');
        return;
      }
      if (!response || response.ok !== true) {
        onDone(null, response?.error ?? '페이지 에이전트 호출 실패');
        return;
      }
      onDone('result' in response ? (response.result ?? null) : null);
    },
  );
}

/**
 * 현재 "보여야 하는 패널 집합"과 "레이아웃 트리"를 정합성 있게 맞춘다.
 * 1) 숨김 패널을 레이아웃에서 제거한다.
 * 2) 중복 패널 노드를 제거한다.
 * 3) visible인데 레이아웃에 없는 패널을 다시 append한다.
 */
function reconcileWorkspaceLayout() {
  const visiblePanelIds = getWorkspaceVisiblePanelIds(workspacePanelStateById);
  const visiblePanelSet = new Set<WorkspacePanelId>(visiblePanelIds);
  workspaceLayoutRoot = dedupeWorkspaceLayoutPanels(
    pruneWorkspaceLayoutByVisiblePanels(workspaceLayoutRoot, visiblePanelSet),
  );
  visiblePanelIds.forEach((panelId) => {
    const idsInLayout = collectPanelIdsFromLayout(workspaceLayoutRoot);
    if (!idsInLayout.has(panelId)) {
      workspaceLayoutRoot = appendPanelToWorkspaceLayout(workspaceLayoutRoot, panelId);
    }
  });
}

/**
 * 워크스페이스 UI 상태를 localStorage에 영속화한다.
 * - 패널 가시 상태 맵
 * - split/panel 트리 레이아웃
 */
function persistWorkspaceState() {
  const serializablePanelState = Object.fromEntries(
    WORKSPACE_PANEL_IDS.map((panelId) => [panelId, workspacePanelStateById.get(panelId) ?? 'visible']),
  ) as Record<WorkspacePanelId, WorkspacePanelState>;
  writeStoredJson(WORKSPACE_PANEL_STATE_STORAGE_KEY, serializablePanelState);
  writeStoredJson(WORKSPACE_LAYOUT_STORAGE_KEY, workspaceLayoutRoot);
}

/**
 * localStorage의 워크스페이스 상태를 복원한다.
 * 과거 버전의 `minimized` 값은 현재 모델(`visible|closed`)로 안전 변환한다.
 */
function restoreWorkspaceState() {
  const storedState = readStoredJson<Record<string, unknown>>(WORKSPACE_PANEL_STATE_STORAGE_KEY);
  workspacePanelStateById = new Map<WorkspacePanelId, WorkspacePanelState>();
  WORKSPACE_PANEL_IDS.forEach((panelId) => {
    const raw = storedState?.[panelId];
    if (raw === 'visible' || raw === 'closed') {
      workspacePanelStateById.set(panelId, raw);
      return;
    }
    if (raw === 'minimized') {
      workspacePanelStateById.set(panelId, 'visible');
      return;
    }
    workspacePanelStateById.set(panelId, 'visible');
  });

  const storedLayout = readStoredJson<unknown>(WORKSPACE_LAYOUT_STORAGE_KEY);
  workspaceLayoutRoot = parseWorkspaceLayoutNode(storedLayout) ?? createDefaultWorkspaceLayout();
}

/** 화면 요소를 렌더링 */
function renderWorkspacePanelToggleBar() {
  const toggleButtons = workspacePanelToggleBarEl.querySelectorAll<HTMLButtonElement>(
    '.workspace-toggle-btn[data-panel-toggle]',
  );
  toggleButtons.forEach((button) => {
    const panelIdRaw = button.dataset.panelToggle;
    if (!isWorkspacePanelId(panelIdRaw)) return;
    const state = workspacePanelStateById.get(panelIdRaw) ?? 'visible';
    button.classList.toggle('active', state !== 'closed');
    button.setAttribute('aria-pressed', state !== 'closed' ? 'true' : 'false');
  });
}

/** UI 상태 또는 문구를 설정 */
function updateWorkspacePanelControlState(panelId: WorkspacePanelId) {
  const panelEl = workspacePanelElements.get(panelId);
  if (!panelEl) return;
  const toggleBtn = panelEl.querySelector<HTMLButtonElement>(
    `.workspace-panel-action[data-panel-action="toggle"][data-panel-target="${panelId}"]`,
  );
  if (!toggleBtn) return;
  toggleBtn.textContent = panelEl.open ? '▾' : '▸';
  toggleBtn.title = panelEl.open ? '접기' : '펼치기';
}

/** 노드가 접혔을 때 필요한 높이를 계산 */
function getWorkspaceNodeCollapsedHeight(
  node: Element | null,
  cache: WeakMap<Element, string | null>,
): string | null {
  if (!(node instanceof Element)) return null;
  if (cache.has(node)) {
    return cache.get(node) ?? null;
  }

  let collapsedHeight: string | null = null;

  if (node instanceof HTMLDetailsElement && node.classList.contains('workspace-panel')) {
    collapsedHeight = node.open ? null : 'var(--workspace-panel-summary-height)';
  } else if (node instanceof HTMLElement && node.classList.contains('workspace-split')) {
    const axis = node.dataset.splitAxis;
    const firstNode = node.querySelector(':scope > .workspace-split-child-first > *');
    const secondNode = node.querySelector(':scope > .workspace-split-child-second > *');
    const firstCollapsedHeight = getWorkspaceNodeCollapsedHeight(firstNode, cache);
    const secondCollapsedHeight = getWorkspaceNodeCollapsedHeight(secondNode, cache);

    if (firstCollapsedHeight && secondCollapsedHeight) {
      if (axis === 'column') {
        collapsedHeight =
          `calc(${firstCollapsedHeight} + var(--workspace-split-divider-size, 10px) + ` +
          `var(--workspace-split-gap, 1px) + var(--workspace-split-gap, 1px) + ` +
          `${secondCollapsedHeight})`;
      } else if (axis === 'row') {
        collapsedHeight = `max(${firstCollapsedHeight}, ${secondCollapsedHeight})`;
      }
    }
  }

  cache.set(node, collapsedHeight);
  return collapsedHeight;
}

/** 레이아웃/상태를 동기화 */
function syncWorkspaceSplitCollapsedRows() {
  const splitElements = panelContentEl.querySelectorAll<HTMLElement>('.workspace-split');
  const collapsedHeightCache = new WeakMap<Element, string | null>();

  splitElements.forEach((splitEl) => {
    if (splitEl.dataset.splitAxis !== 'column') {
      splitEl.style.removeProperty('grid-template-rows');
      return;
    }

    const firstNode = splitEl.querySelector(':scope > .workspace-split-child-first > *');
    const secondNode = splitEl.querySelector(':scope > .workspace-split-child-second > *');
    const firstCollapsedHeight = getWorkspaceNodeCollapsedHeight(firstNode, collapsedHeightCache);
    const secondCollapsedHeight = getWorkspaceNodeCollapsedHeight(secondNode, collapsedHeightCache);
    const dividerSize = 'var(--workspace-split-divider-size, 10px)';

    if (firstCollapsedHeight && secondCollapsedHeight) {
      splitEl.style.gridTemplateRows = `${firstCollapsedHeight} ${dividerSize} ${secondCollapsedHeight}`;
    } else if (firstCollapsedHeight) {
      splitEl.style.gridTemplateRows = `${firstCollapsedHeight} ${dividerSize} minmax(0, 1fr)`;
    } else if (secondCollapsedHeight) {
      splitEl.style.gridTemplateRows = `minmax(0, 1fr) ${dividerSize} ${secondCollapsedHeight}`;
    } else {
      splitEl.style.removeProperty('grid-template-rows');
    }
  });
}

interface WorkspaceScrollSnapshot {
  element: HTMLElement;
  top: number;
  left: number;
}

/** 현재 워크스페이스 내 스크롤 위치를 캡처 */
function captureWorkspaceScrollSnapshots(): WorkspaceScrollSnapshot[] {
  const snapshots: WorkspaceScrollSnapshot[] = [];
  const seen = new Set<HTMLElement>();
  const allElements = panelContentEl.querySelectorAll<HTMLElement>('*');
  allElements.forEach((el) => {
    if (seen.has(el)) return;
    if (el.scrollTop === 0 && el.scrollLeft === 0) return;
    const hasScrollableRange =
      el.scrollHeight > el.clientHeight + 1 || el.scrollWidth > el.clientWidth + 1;
    if (!hasScrollableRange) return;
    snapshots.push({
      element: el,
      top: el.scrollTop,
      left: el.scrollLeft,
    });
    seen.add(el);
  });
  return snapshots;
}

/** 캡처한 스크롤 위치를 복원 */
function restoreWorkspaceScrollSnapshots(snapshots: WorkspaceScrollSnapshot[]) {
  snapshots.forEach(({ element, top, left }) => {
    if (!element.isConnected) return;
    if (element.scrollTop !== top) {
      element.scrollTop = top;
    }
    if (element.scrollLeft !== left) {
      element.scrollLeft = left;
    }
  });
}

/** 현재 workspace 루트 DOM 노드를 반환 */
function getWorkspaceLayoutRootElement(): HTMLElement | null {
  const candidate = Array.from(panelContentEl.children).find((child) => child !== workspaceDockPreviewEl);
  return candidate instanceof HTMLElement ? candidate : null;
}

/** 파생 데이터나 요약 값을 구성 */
function collectWorkspacePanelIdsFromDom(rootEl: Element | null): Set<WorkspacePanelId> {
  const result = new Set<WorkspacePanelId>();
  if (!(rootEl instanceof Element)) return result;

  if (rootEl instanceof HTMLDetailsElement && isWorkspacePanelId(rootEl.id)) {
    result.add(rootEl.id);
  }

  rootEl.querySelectorAll('details.workspace-panel').forEach((panelEl) => {
    if (panelEl instanceof HTMLDetailsElement && isWorkspacePanelId(panelEl.id)) {
      result.add(panelEl.id);
    }
  });
  return result;
}

/** 조건 여부를 판별 */
function isSameWorkspacePanelIdSet(a: Set<WorkspacePanelId>, b: Set<WorkspacePanelId>): boolean {
  if (a.size !== b.size) return false;
  for (const id of a) {
    if (!b.has(id)) return false;
  }
  return true;
}

/** 조건에 맞는 대상을 탐색 */
function findReusableWorkspaceDomRoot(
  layoutNode: WorkspaceLayoutNode,
  existingRoot: HTMLElement | null,
): HTMLElement | null {
  if (!existingRoot) return null;

  const expectedIds = collectPanelIdsFromLayout(layoutNode);
  if (expectedIds.size === 0) return null;

  const currentIds = collectWorkspacePanelIdsFromDom(existingRoot);
  if (isSameWorkspacePanelIdSet(expectedIds, currentIds)) {
    return existingRoot;
  }

  if (!existingRoot.classList.contains('workspace-split')) {
    return null;
  }

  const firstRoot = existingRoot.querySelector<HTMLElement>(':scope > .workspace-split-child-first > *');
  const secondRoot = existingRoot.querySelector<HTMLElement>(':scope > .workspace-split-child-second > *');

  if (firstRoot) {
    const firstIds = collectWorkspacePanelIdsFromDom(firstRoot);
    if (isSameWorkspacePanelIdSet(expectedIds, firstIds)) {
      return firstRoot;
    }
  }
  if (secondRoot) {
    const secondIds = collectWorkspacePanelIdsFromDom(secondRoot);
    if (isSameWorkspacePanelIdSet(expectedIds, secondIds)) {
      return secondRoot;
    }
  }

  return null;
}

/** 파생 데이터나 요약 값을 구성 */
function createWorkspaceSplitElement(axis: 'row' | 'column'): HTMLDivElement {
  const splitEl = document.createElement('div');
  splitEl.className = `workspace-split workspace-split-${axis}`;
  splitEl.dataset.splitAxis = axis;

  const firstSlot = document.createElement('div');
  firstSlot.className = 'workspace-split-child workspace-split-child-first';
  splitEl.appendChild(firstSlot);

  const divider = document.createElement('div');
  divider.className = `workspace-split-divider workspace-split-divider-${axis}`;
  divider.setAttribute('role', 'separator');
  divider.setAttribute('aria-orientation', axis === 'row' ? 'vertical' : 'horizontal');
  divider.setAttribute('aria-label', 'Resize workspace panels');
  splitEl.appendChild(divider);

  const secondSlot = document.createElement('div');
  secondSlot.className = 'workspace-split-child workspace-split-child-second';
  splitEl.appendChild(secondSlot);
  return splitEl;
}

/** 생성한 노드를 컨테이너에 추가 */
function patchWorkspaceLayoutDomNode(
  layoutNode: WorkspaceLayoutNode,
  existingRoot: HTMLElement | null,
  path: WorkspaceNodePath = [],
): HTMLElement {
  const reusableRoot = findReusableWorkspaceDomRoot(layoutNode, existingRoot);

  if (layoutNode.type === 'panel') {
    const panelEl = workspacePanelElements.get(layoutNode.panelId);
    if (!panelEl) {
      const fallback = document.createElement('div');
      fallback.className = 'workspace-panel-missing';
      fallback.textContent = `패널을 찾을 수 없습니다: ${layoutNode.panelId}`;
      return fallback;
    }
    panelEl.classList.remove('workspace-split-child', 'workspace-split-child-first', 'workspace-split-child-second');
    return panelEl;
  }

  const splitEl =
    reusableRoot && reusableRoot.classList.contains('workspace-split') && reusableRoot.dataset.splitAxis === layoutNode.axis
      ? reusableRoot
      : createWorkspaceSplitElement(layoutNode.axis);

  splitEl.classList.add('workspace-split', `workspace-split-${layoutNode.axis}`);
  splitEl.classList.remove(layoutNode.axis === 'row' ? 'workspace-split-column' : 'workspace-split-row');
  splitEl.dataset.splitAxis = layoutNode.axis;
  splitEl.dataset.splitPath = stringifyWorkspaceNodePath(path);
  splitEl.style.setProperty('--workspace-split-first', `${layoutNode.ratio}fr`);
  splitEl.style.setProperty('--workspace-split-second', `${1 - layoutNode.ratio}fr`);

  const firstSlot = splitEl.querySelector<HTMLElement>(':scope > .workspace-split-child-first');
  const divider = splitEl.querySelector<HTMLElement>(':scope > .workspace-split-divider');
  const secondSlot = splitEl.querySelector<HTMLElement>(':scope > .workspace-split-child-second');
  if (!firstSlot || !divider || !secondSlot) {
    const recreated = createWorkspaceSplitElement(layoutNode.axis);
    return patchWorkspaceLayoutDomNode(layoutNode, recreated, path);
  }

  divider.className = `workspace-split-divider workspace-split-divider-${layoutNode.axis}`;
  divider.setAttribute('aria-orientation', layoutNode.axis === 'row' ? 'vertical' : 'horizontal');
  splitEl.append(firstSlot, divider, secondSlot);

  const firstExpectedIds = collectPanelIdsFromLayout(layoutNode.first);
  const secondExpectedIds = collectPanelIdsFromLayout(layoutNode.second);

  let firstExistingRoot = firstSlot.firstElementChild as HTMLElement | null;
  let secondExistingRoot = secondSlot.firstElementChild as HTMLElement | null;
  if (!reusableRoot && existingRoot) {
    const existingIds = collectWorkspacePanelIdsFromDom(existingRoot);
    if (!firstExistingRoot && isSameWorkspacePanelIdSet(existingIds, firstExpectedIds)) {
      firstExistingRoot = existingRoot;
    } else if (!secondExistingRoot && isSameWorkspacePanelIdSet(existingIds, secondExpectedIds)) {
      secondExistingRoot = existingRoot;
    } else if (existingRoot.classList.contains('workspace-split')) {
      const existingFirst = existingRoot.querySelector<HTMLElement>(
        ':scope > .workspace-split-child-first > *',
      );
      const existingSecond = existingRoot.querySelector<HTMLElement>(
        ':scope > .workspace-split-child-second > *',
      );
      if (existingFirst && !firstExistingRoot) {
        const existingFirstIds = collectWorkspacePanelIdsFromDom(existingFirst);
        if (isSameWorkspacePanelIdSet(existingFirstIds, firstExpectedIds)) {
          firstExistingRoot = existingFirst;
        }
      }
      if (existingSecond && !secondExistingRoot) {
        const existingSecondIds = collectWorkspacePanelIdsFromDom(existingSecond);
        if (isSameWorkspacePanelIdSet(existingSecondIds, secondExpectedIds)) {
          secondExistingRoot = existingSecond;
        }
      }
    }
  }

  const firstPatched = patchWorkspaceLayoutDomNode(
    layoutNode.first,
    firstExistingRoot,
    [...path, 'first'],
  );
  const secondPatched = patchWorkspaceLayoutDomNode(
    layoutNode.second,
    secondExistingRoot,
    [...path, 'second'],
  );

  if (firstExistingRoot !== firstPatched || firstSlot.childElementCount !== 1) {
    firstSlot.replaceChildren(firstPatched);
  }
  if (secondExistingRoot !== secondPatched || secondSlot.childElementCount !== 1) {
    secondSlot.replaceChildren(secondPatched);
  }

  return splitEl;
}

/** 레이아웃을 재구성하지 않고 패널 접기/펼치기 상태만 반영 */
function toggleWorkspacePanelOpenState(panelId: WorkspacePanelId) {
  const panelEl = workspacePanelElements.get(panelId);
  if (!panelEl || panelEl.hidden) return;
  panelEl.open = !panelEl.open;
  updateWorkspacePanelControlState(panelId);
  syncWorkspaceSplitCollapsedRows();
  syncWorkspacePanelBodySizes();
}

/** 레이아웃 class 오염을 정리 */
function resetWorkspacePanelSplitClasses() {
  workspacePanelElements.forEach((panelEl) => {
    panelEl.classList.remove('workspace-split-child', 'workspace-split-child-first', 'workspace-split-child-second');
  });
}

/** 레이아웃/상태를 동기화 */
function syncWorkspacePanelBodySizes() {
  workspacePanelElements.forEach((panelEl) => {
    const bodyEl = panelEl.querySelector<HTMLElement>(':scope > .components-pane-body');
    if (!bodyEl) return;

    if (!panelEl.open || panelEl.hidden) {
      if (bodyEl.style.width !== '0px') {
        bodyEl.style.width = '0px';
      }
      if (bodyEl.style.height !== '0px') {
        bodyEl.style.height = '0px';
      }
      return;
    }

    const summaryEl = panelEl.querySelector<HTMLElement>(':scope > summary.workspace-panel-summary');
    const summaryHeight = summaryEl ? Math.ceil(summaryEl.getBoundingClientRect().height) : 0;
    const width = Math.max(0, Math.floor(panelEl.clientWidth));
    const height = Math.max(0, Math.floor(panelEl.clientHeight - summaryHeight));
    const nextWidth = `${width}px`;
    const nextHeight = `${height}px`;
    if (bodyEl.style.width !== nextWidth) {
      bodyEl.style.width = nextWidth;
    }
    if (bodyEl.style.height !== nextHeight) {
      bodyEl.style.height = nextHeight;
    }
  });
}

/** 초기화 */
function initWorkspacePanelBodySizeObserver() {
  if (typeof ResizeObserver === 'undefined') return;
  if (workspacePanelBodySizeObserver) {
    workspacePanelBodySizeObserver.disconnect();
  }

  workspacePanelBodySizeObserver = new ResizeObserver(() => {
    syncWorkspacePanelBodySizes();
  });
  workspacePanelBodySizeObserver.observe(panelContentEl);
  workspacePanelElements.forEach((panelEl) => {
    workspacePanelBodySizeObserver?.observe(panelEl);
  });
}

/** 화면 요소를 렌더링 */
function hideWorkspaceDockPreview() {
  workspaceDockPreviewEl.style.display = 'none';
}

/** 화면 요소를 렌더링 */
function showWorkspaceDockPreview(baseRect: DOMRect, direction: WorkspaceDockDirection) {
  const hostRect = panelContentEl.getBoundingClientRect();
  const previewLeft = baseRect.left - hostRect.left;
  const previewTop = baseRect.top - hostRect.top;
  const width = baseRect.width;
  const height = baseRect.height;

  let left = previewLeft;
  let top = previewTop;
  let previewWidth = width;
  let previewHeight = height;

  if (direction === 'left') {
    previewWidth = width / 2;
  } else if (direction === 'right') {
    previewWidth = width / 2;
    left = previewLeft + width / 2;
  } else if (direction === 'top') {
    previewHeight = height / 2;
  } else if (direction === 'bottom') {
    previewHeight = height / 2;
    top = previewTop + height / 2;
  }

  workspaceDockPreviewEl.style.display = 'block';
  workspaceDockPreviewEl.style.left = `${Math.round(left)}px`;
  workspaceDockPreviewEl.style.top = `${Math.round(top)}px`;
  workspaceDockPreviewEl.style.width = `${Math.max(0, Math.round(previewWidth))}px`;
  workspaceDockPreviewEl.style.height = `${Math.max(0, Math.round(previewHeight))}px`;
}

/**
 * 워크스페이스 레이아웃 렌더 파이프라인.
 * 1) 패널 가시 상태를 DOM에 먼저 반영한다.
 * 2) split 트리를 patch(재사용 우선)해서 DOM churn을 최소화한다.
 * 3) 접힘 높이/토글바/패널 body 사이즈/스크롤 위치를 후처리로 복원한다.
 */
function renderWorkspaceLayout() {
  // 이전 렌더에서 남은 split-child class를 정리해서 patch 기준점을 안정화한다.
  resetWorkspacePanelSplitClasses();
  reconcileWorkspaceLayout();

  WORKSPACE_PANEL_IDS.forEach((panelId) => {
    const panelEl = workspacePanelElements.get(panelId);
    if (!panelEl) return;
    const state = workspacePanelStateById.get(panelId) ?? 'visible';
    panelEl.hidden = state !== 'visible';
    panelEl.dataset.panelState = state;
    updateWorkspacePanelControlState(panelId);
  });

  // 도킹 프리뷰는 항상 panelContent의 첫 번째 자식으로 유지한다.
  if (workspaceDockPreviewEl.parentElement !== panelContentEl) {
    panelContentEl.appendChild(workspaceDockPreviewEl);
  }
  if (panelContentEl.firstElementChild !== workspaceDockPreviewEl) {
    panelContentEl.insertBefore(workspaceDockPreviewEl, panelContentEl.firstChild);
  }
  hideWorkspaceDockPreview();

  // DOM patch 전/후 스크롤 위치를 복원해 렌더 중 사용자 위치 점프를 줄인다.
  const scrollSnapshots = captureWorkspaceScrollSnapshots();
  const existingRoot = getWorkspaceLayoutRootElement();
  let nextRoot: HTMLElement;
  if (workspaceLayoutRoot) {
    nextRoot = patchWorkspaceLayoutDomNode(workspaceLayoutRoot, existingRoot, []);
  } else {
    if (existingRoot && existingRoot.classList.contains('workspace-empty')) {
      nextRoot = existingRoot;
    } else {
      const empty = document.createElement('div');
      empty.className = 'workspace-empty';
      empty.textContent = '표시 중인 패널이 없습니다. 하단 footer에서 패널을 다시 켜주세요.';
      nextRoot = empty;
    }
  }

  if (nextRoot.parentElement !== panelContentEl) {
    panelContentEl.insertBefore(nextRoot, workspaceDockPreviewEl.nextSibling);
  } else if (workspaceDockPreviewEl.nextSibling !== nextRoot) {
    panelContentEl.insertBefore(nextRoot, workspaceDockPreviewEl.nextSibling);
  }

  // 최종적으로 하나의 root만 남기고 나머지 orphan 노드를 제거한다.
  Array.from(panelContentEl.children).forEach((child) => {
    if (child !== workspaceDockPreviewEl && child !== nextRoot) {
      panelContentEl.removeChild(child);
    }
  });

  if (workspaceLayoutRoot) {
    syncWorkspaceSplitCollapsedRows();
  }
  renderWorkspacePanelToggleBar();
  syncWorkspacePanelBodySizes();
  restoreWorkspaceScrollSnapshots(scrollSnapshots);
}

/**
 * 단일 패널의 가시 상태를 변경하고 레이아웃 트리에 반영한다.
 * `visible`로 전환할 때는 즉시 `open=true`로 강제해 body 높이 계산이 깨지지 않게 한다.
 */
function setWorkspacePanelState(panelId: WorkspacePanelId, state: WorkspacePanelState) {
  workspacePanelStateById.set(panelId, state);
  if (state === 'visible') {
    const panelEl = workspacePanelElements.get(panelId);
    if (panelEl) {
      panelEl.open = true;
    }
  } else {
    const removal = removePanelFromWorkspaceLayout(workspaceLayoutRoot, panelId);
    workspaceLayoutRoot = removal.node;
  }
  persistWorkspaceState();
  renderWorkspaceLayout();
}

/** 조건에 맞는 대상을 탐색 */
function findWorkspacePanelByPoint(clientX: number, clientY: number): HTMLDetailsElement | null {
  const target = document.elementFromPoint(clientX, clientY);
  const panelEl = target instanceof HTMLElement ? target.closest('details.workspace-panel') : null;
  if (!(panelEl instanceof HTMLDetailsElement)) return null;
  if (!isWorkspacePanelId(panelEl.id)) return null;
  if (panelEl.hidden) return null;
  return panelEl;
}

/** 필요한 값/상태를 계산해 반환 */
function computeWorkspaceDockDirection(
  panelEl: HTMLElement,
  clientX: number,
  clientY: number,
): WorkspaceDockDirection {
  const rect = panelEl.getBoundingClientRect();
  const edgeX = Math.max(44, rect.width * 0.24);
  const edgeY = Math.max(44, rect.height * 0.24);

  if (clientX < rect.left + edgeX) return 'left';
  if (clientX > rect.right - edgeX) return 'right';
  if (clientY < rect.top + edgeY) return 'top';
  if (clientY > rect.bottom - edgeY) return 'bottom';
  return 'center';
}

/** 해당 기능 흐름을 처리 */
function applyWorkspaceDockDrop(draggedPanelId: WorkspacePanelId, dropTarget: WorkspaceDropTarget) {
  const targetPanelId = dropTarget.targetPanelId;
  if (!targetPanelId) return;
  if (draggedPanelId === targetPanelId) return;

  if (dropTarget.direction === 'center') {
    workspaceLayoutRoot = swapWorkspaceLayoutPanels(
      workspaceLayoutRoot,
      draggedPanelId,
      targetPanelId,
    );
    persistWorkspaceState();
    renderWorkspaceLayout();
    return;
  }

  const removed = removePanelFromWorkspaceLayout(workspaceLayoutRoot, draggedPanelId);
  const baseRoot = removed.node;
  const draggedNode = createWorkspacePanelNode(draggedPanelId);
  if (!baseRoot) {
    workspaceLayoutRoot = draggedNode;
    persistWorkspaceState();
    renderWorkspaceLayout();
    return;
  }

  const inserted = insertPanelByDockTarget(baseRoot, targetPanelId, draggedNode, dropTarget.direction);
  workspaceLayoutRoot = inserted.inserted
    ? inserted.node
    : appendPanelToWorkspaceLayout(baseRoot, draggedPanelId);
  persistWorkspaceState();
  renderWorkspaceLayout();
}

/** 이벤트를 처리 */
function onWorkspacePanelDragStart(event: DragEvent) {
  const summaryEl = event.currentTarget as HTMLElement | null;
  const panelEl = summaryEl?.closest('details.workspace-panel');
  if (!(panelEl instanceof HTMLDetailsElement)) return;
  if (!isWorkspacePanelId(panelEl.id)) return;
  workspaceDragPanelId = panelEl.id;
  workspaceDropTarget = null;
  panelEl.classList.add('workspace-dragging');
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', panelEl.id);
  }
}

/** 이벤트를 처리 */
function onWorkspacePanelDragEnd() {
  workspaceDragPanelId = null;
  workspaceDropTarget = null;
  workspacePanelElements.forEach((panelEl) => panelEl.classList.remove('workspace-dragging'));
  hideWorkspaceDockPreview();
}

/** 이벤트를 처리 */
function onWorkspaceDragOver(event: DragEvent) {
  if (!workspaceDragPanelId) return;
  event.preventDefault();

  const panelEl = findWorkspacePanelByPoint(event.clientX, event.clientY);
  if (!panelEl || !isWorkspacePanelId(panelEl.id)) {
    workspaceDropTarget = {
      targetPanelId: null,
      direction: 'center',
    };
    showWorkspaceDockPreview(panelContentEl.getBoundingClientRect(), 'center');
    return;
  }

  const direction = computeWorkspaceDockDirection(panelEl, event.clientX, event.clientY);
  workspaceDropTarget = {
    targetPanelId: panelEl.id,
    direction,
  };
  showWorkspaceDockPreview(panelEl.getBoundingClientRect(), direction);
}

/** 이벤트를 처리 */
function onWorkspaceDrop(event: DragEvent) {
  if (!workspaceDragPanelId) return;
  event.preventDefault();
  if (workspaceDropTarget) {
    applyWorkspaceDockDrop(workspaceDragPanelId, workspaceDropTarget);
  }
  onWorkspacePanelDragEnd();
}

/** 이벤트를 처리 */
function onWorkspaceDragLeave(event: DragEvent) {
  const nextTarget = event.relatedTarget;
  if (nextTarget instanceof Node && panelContentEl.contains(nextTarget)) return;
  hideWorkspaceDockPreview();
}

/** 이벤트를 처리 */
function onWorkspaceSplitResizePointerMove(event: PointerEvent) {
  const state = workspaceResizeDragState;
  if (!state) return;
  const totalSize =
    state.axis === 'row'
      ? state.splitRect.width - state.dividerSize
      : state.splitRect.height - state.dividerSize;
  if (totalSize <= 0) return;

  const pointerOffset =
    state.axis === 'row'
      ? event.clientX - state.splitRect.left
      : event.clientY - state.splitRect.top;
  const nextRatio = clampWorkspaceSplitRatio((pointerOffset - state.dividerSize / 2) / totalSize);
  state.ratio = nextRatio;
  state.splitEl.style.setProperty('--workspace-split-first', `${nextRatio}fr`);
  state.splitEl.style.setProperty('--workspace-split-second', `${1 - nextRatio}fr`);
  event.preventDefault();
}

/** 해당 기능 흐름을 처리 */
function stopWorkspaceSplitResize(shouldPersist: boolean) {
  const state = workspaceResizeDragState;
  if (!state) return;

  window.removeEventListener('pointermove', onWorkspaceSplitResizePointerMove);
  window.removeEventListener('pointerup', onWorkspaceSplitResizePointerUp);
  window.removeEventListener('pointercancel', onWorkspaceSplitResizePointerCancel);

  document.body.style.userSelect = '';
  document.body.style.cursor = '';

  const dividerEl = state.splitEl.querySelector<HTMLElement>(':scope > .workspace-split-divider');
  dividerEl?.classList.remove('dragging');

  if (shouldPersist) {
    workspaceLayoutRoot = updateWorkspaceSplitRatioByPath(
      workspaceLayoutRoot,
      state.splitPath,
      state.ratio,
    );
    persistWorkspaceState();
  }
  workspaceResizeDragState = null;
}

/** 이벤트를 처리 */
function onWorkspaceSplitResizePointerUp() {
  stopWorkspaceSplitResize(true);
}

/** 이벤트를 처리 */
function onWorkspaceSplitResizePointerCancel() {
  stopWorkspaceSplitResize(false);
}

/** 이벤트를 처리 */
function onWorkspaceSplitResizePointerDown(event: PointerEvent) {
  const target = event.target as HTMLElement | null;
  const dividerEl = target?.closest<HTMLElement>('.workspace-split-divider');
  if (!dividerEl || event.button !== 0) return;
  const splitEl = dividerEl.parentElement;
  if (!(splitEl instanceof HTMLElement)) return;
  const axisRaw = splitEl.dataset.splitAxis;
  if (axisRaw !== 'row' && axisRaw !== 'column') return;

  const splitRect = splitEl.getBoundingClientRect();
  const dividerRect = dividerEl.getBoundingClientRect();
  const dividerSize = axisRaw === 'row' ? dividerRect.width : dividerRect.height;
  const splitPath = parseWorkspaceNodePath(splitEl.dataset.splitPath ?? '');
  const firstRaw = splitEl.style.getPropertyValue('--workspace-split-first').trim();
  const nextRatioFromCss = Number.parseFloat(firstRaw.replace('fr', ''));
  const ratio = Number.isFinite(nextRatioFromCss) ? clampWorkspaceSplitRatio(nextRatioFromCss) : 0.5;

  workspaceResizeDragState = {
    splitPath,
    axis: axisRaw,
    splitEl,
    splitRect,
    dividerSize,
    ratio,
  };

  dividerEl.classList.add('dragging');
  document.body.style.userSelect = 'none';
  document.body.style.cursor = axisRaw === 'row' ? 'col-resize' : 'row-resize';

  window.addEventListener('pointermove', onWorkspaceSplitResizePointerMove);
  window.addEventListener('pointerup', onWorkspaceSplitResizePointerUp);
  window.addEventListener('pointercancel', onWorkspaceSplitResizePointerCancel);
  event.preventDefault();
}

/** 이벤트를 처리 */
function onWorkspaceSplitDividerDoubleClick(event: MouseEvent) {
  const target = event.target as HTMLElement | null;
  const dividerEl = target?.closest<HTMLElement>('.workspace-split-divider');
  if (!dividerEl) return;

  const splitEl = dividerEl.parentElement;
  if (!(splitEl instanceof HTMLElement)) return;

  const splitPath = parseWorkspaceNodePath(splitEl.dataset.splitPath ?? '');
  const nextRatio = WORKSPACE_DOCK_SPLIT_RATIO;

  splitEl.style.setProperty('--workspace-split-first', `${nextRatio}fr`);
  splitEl.style.setProperty('--workspace-split-second', `${1 - nextRatio}fr`);
  workspaceLayoutRoot = updateWorkspaceSplitRatioByPath(workspaceLayoutRoot, splitPath, nextRatio);
  persistWorkspaceState();
  event.preventDefault();
}

/** 이벤트를 처리 */
function onWorkspaceSummaryAction(event: MouseEvent) {
  const target = event.target as HTMLElement | null;
  const actionButton = target?.closest<HTMLButtonElement>('.workspace-panel-action[data-panel-action]');
  if (!actionButton) return;

  const panelIdRaw = actionButton.dataset.panelTarget;
  if (!isWorkspacePanelId(panelIdRaw)) return;
  const action = actionButton.dataset.panelAction;
  event.preventDefault();
  event.stopPropagation();

  if (action === 'toggle') {
    toggleWorkspacePanelOpenState(panelIdRaw);
    return;
  }
  if (action === 'close') {
    setWorkspacePanelState(panelIdRaw, 'closed');
  }
}

/** 이벤트를 처리 */
function onWorkspaceSummaryClick(event: MouseEvent) {
  const target = event.target as HTMLElement | null;
  const actionButton = target?.closest<HTMLButtonElement>('.workspace-panel-action[data-panel-action]');
  if (actionButton) return;
  event.preventDefault();
}

/** 이벤트를 처리 */
function onWorkspacePanelToggleButtonClick(event: MouseEvent) {
  const target = event.target as HTMLElement | null;
  const button = target?.closest<HTMLButtonElement>('.workspace-toggle-btn[data-panel-toggle]');
  if (!button) return;
  const panelIdRaw = button.dataset.panelToggle;
  if (!isWorkspacePanelId(panelIdRaw)) return;
  const state = workspacePanelStateById.get(panelIdRaw) ?? 'visible';
  setWorkspacePanelState(panelIdRaw, state === 'visible' ? 'closed' : 'visible');
}

/**
 * 워크스페이스 상호작용(드래그/리사이즈/토글/옵저버) 초기화 진입점.
 * 순서가 중요한 이유:
 * 1) restore로 상태 모델을 먼저 만든다.
 * 2) 패널별 이벤트를 바인딩한다.
 * 3) 컨테이너 레벨 이벤트를 바인딩한다.
 * 4) 마지막에 1회 렌더를 수행한다.
 */
function initWorkspaceLayoutManager() {
  restoreWorkspaceState();

  workspacePanelElements.forEach((panelEl, panelId) => {
    panelEl.classList.add('workspace-panel');
    panelEl.dataset.panelId = panelId;
    const summaryEl = panelEl.querySelector<HTMLElement>('summary.workspace-panel-summary');
    if (summaryEl) {
      summaryEl.draggable = true;
      summaryEl.addEventListener('dragstart', onWorkspacePanelDragStart);
      summaryEl.addEventListener('dragend', onWorkspacePanelDragEnd);
      summaryEl.addEventListener('click', onWorkspaceSummaryAction);
      summaryEl.addEventListener('click', onWorkspaceSummaryClick);
    }
    const actionButtons = panelEl.querySelectorAll<HTMLButtonElement>('.workspace-panel-action');
    actionButtons.forEach((button) => {
      button.addEventListener('mousedown', (event) => {
        event.stopPropagation();
      });
      button.addEventListener('dragstart', (event) => {
        event.preventDefault();
      });
    });
  });

  panelContentEl.addEventListener('dragover', onWorkspaceDragOver);
  panelContentEl.addEventListener('drop', onWorkspaceDrop);
  panelContentEl.addEventListener('dragleave', onWorkspaceDragLeave);
  panelContentEl.addEventListener('pointerdown', onWorkspaceSplitResizePointerDown);
  panelContentEl.addEventListener('dblclick', onWorkspaceSplitDividerDoubleClick);
  workspacePanelToggleBarEl.addEventListener('click', onWorkspacePanelToggleButtonClick);
  initWorkspacePanelBodySizeObserver();
  renderWorkspaceLayout();
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

/** 렌더링에 사용할 DOM/데이터 구조를 생성 */
function createDomTagLabel(node: DomTreeNode): HTMLElement {
  const line = document.createElement('span');
  line.className = 'dom-tag';

  const lt = document.createElement('span');
  lt.className = 'dom-bracket';
  lt.textContent = '<';
  line.appendChild(lt);

  const tag = document.createElement('span');
  tag.className = 'dom-tag-name';
  tag.textContent = node.tagName || 'unknown';
  line.appendChild(tag);

  node.attributes.forEach((attr) => {
    line.appendChild(document.createTextNode(' '));

    const name = document.createElement('span');
    name.className = 'dom-attr-name';
    name.textContent = attr.name;
    line.appendChild(name);

    const eqAndQuote = document.createElement('span');
    eqAndQuote.className = 'dom-bracket';
    eqAndQuote.textContent = '="';
    line.appendChild(eqAndQuote);

    const value = document.createElement('span');
    value.className = 'dom-attr-value';
    value.textContent = attr.value;
    line.appendChild(value);

    const closingQuote = document.createElement('span');
    closingQuote.className = 'dom-bracket';
    closingQuote.textContent = '"';
    line.appendChild(closingQuote);
  });

  const gt = document.createElement('span');
  gt.className = 'dom-bracket';
  gt.textContent = '>';
  line.appendChild(gt);

  if (node.textPreview) {
    const textPreview = document.createElement('span');
    textPreview.className = 'dom-text-preview';
    textPreview.textContent = `"${node.textPreview}"`;
    line.appendChild(textPreview);
  }

  return line;
}

/** 렌더링에 사용할 DOM/데이터 구조를 생성 */
function createDomClosingTagLabel(tagName: string): HTMLElement {
  const line = document.createElement('span');
  line.className = 'dom-tag';

  const lt = document.createElement('span');
  lt.className = 'dom-bracket';
  lt.textContent = '</';
  line.appendChild(lt);

  const tag = document.createElement('span');
  tag.className = 'dom-tag-name';
  tag.textContent = tagName || 'unknown';
  line.appendChild(tag);

  const gt = document.createElement('span');
  gt.className = 'dom-bracket';
  gt.textContent = '>';
  line.appendChild(gt);

  return line;
}

/** 화면 요소를 렌더링 */
function renderDomTreeNode(node: DomTreeNode, depth = 0): HTMLElement {
  const hasChildren = node.children.length > 0 || node.truncatedChildren > 0;
  if (!hasChildren) {
    const leaf = document.createElement('div');
    leaf.className = 'dom-leaf';
    leaf.appendChild(createDomTagLabel(node));
    return leaf;
  }

  const details = document.createElement('details');
  details.className = 'dom-node';
  if (depth < 1) details.open = true;

  const summary = document.createElement('summary');
  summary.appendChild(createDomTagLabel(node));
  details.appendChild(summary);

  const children = document.createElement('div');
  children.className = 'dom-children';
  node.children.forEach((child) => {
    children.appendChild(renderDomTreeNode(child, depth + 1));
  });

  if (node.truncatedChildren > 0) {
    const note = document.createElement('div');
    note.className = 'dom-note';
    note.textContent = `... ${node.truncatedChildren}개 자식 노드 생략됨`;
    children.appendChild(note);
  }

  const closing = document.createElement('div');
  closing.className = 'dom-closing-tag';
  closing.appendChild(createDomClosingTagLabel(node.tagName));
  details.appendChild(children);
  details.appendChild(closing);
  return details;
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
      if (errorText) {
        setDomTreeStatus(`DOM 트리 실행 오류: ${errorText}`, true);
        setDomTreeEmpty('DOM 트리를 가져오지 못했습니다.');
        return;
      }
      if (!isDomTreeEvalResult(res) || !res.ok) {
        const reason = isDomTreeEvalResult(res) ? res.error : '응답 형식 오류';
        setDomTreeStatus(`DOM 트리 조회 실패: ${reason ?? '알 수 없는 오류'}`, true);
        setDomTreeEmpty('DOM 트리를 가져오지 못했습니다.');
        return;
      }
      applyDomTreeResult(res);
    },
  );
}

/** 기존 상태를 정리 */
function clearPageComponentHighlight() {
  callInspectedPageAgent('clearComponentHighlight', null, () => {
    /** 동작 없음. */
  });
}

/** 기존 상태를 정리 */
function clearPageHoverPreview() {
  callInspectedPageAgent('clearHoverPreview', null, () => {
    /** 동작 없음. */
  });
}

/** 해당 기능 흐름을 처리 */
function previewPageDomForComponent(component: ReactComponentInfo) {
  if (!component.domSelector) return;
  callInspectedPageAgent('previewComponent', { selector: component.domSelector }, () => {
    /** 동작 없음. */
  });
}

/** UI 상태 또는 문구를 설정 */
function setElementOutputFromHighlightResult(
  result: PageHighlightResult,
  fallback: ReactComponentInfo,
) {
  const lines = [
    `tagName: ${result.tagName ?? fallback.domTagName ?? ''}`,
    `selector: ${result.selector ?? fallback.domSelector ?? ''}`,
    `domPath: ${result.domPath ?? fallback.domPath ?? ''}`,
    result.rect ? `rect: ${JSON.stringify(result.rect)}` : null,
  ].filter(Boolean);
  setElementOutput(lines.join('\n'));
}

/**
 * 선택 컴포넌트의 실제 DOM 하이라이트 + 선택 요소 패널 동기화 + DOM 트리 재조회.
 * 이 함수가 성공하면 우측 패널(Selected Element / DOM Path / DOM Tree)이
 * 같은 selector 기준으로 함께 업데이트된다.
 */
function highlightPageDomForComponent(component: ReactComponentInfo) {
  if (!component.domSelector) {
    clearPageComponentHighlight();
    setReactStatus(`선택한 컴포넌트(${component.name})는 연결된 DOM 요소가 없습니다.`);
    setElementOutput(`component: ${component.name}\nDOM 매핑 없음`);
    setDomTreeStatus('선택한 컴포넌트에 연결된 DOM 요소가 없습니다.', true);
    setDomTreeEmpty('표시할 DOM이 없습니다.');
    return;
  }

  callInspectedPageAgent(
    'highlightComponent',
    { selector: component.domSelector },
    (res, errorText) => {
      if (errorText) {
        setReactStatus(`DOM 하이라이트 실행 오류: ${errorText}`, true);
        return;
      }
      if (!isPageHighlightResult(res) || !res.ok) {
        const reason = isPageHighlightResult(res) ? res.error : '알 수 없는 오류';
        setReactStatus(`DOM 하이라이트 실패: ${reason ?? '알 수 없는 오류'}`, true);
        setDomTreeStatus(`DOM 하이라이트 실패: ${reason ?? '알 수 없는 오류'}`, true);
        setDomTreeEmpty('표시할 DOM이 없습니다.');
        return;
      }
      setReactStatus(`컴포넌트 ${component.name} DOM 하이라이트 완료`);
      setElementOutputFromHighlightResult(res, component);
      fetchDomTree(res.selector ?? component.domSelector ?? '');
    },
  );
}

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

/** 데이터를 순회해 수집 */
function collectRefMap(root: unknown): Map<number, unknown> {
  const map = new Map<number, unknown>();
  const visited = new WeakSet<object>();
  let remaining = 4000;

  const walk = (value: unknown) => {
    if (remaining <= 0) return;
    if (value === null || typeof value !== 'object') return;
    if (visited.has(value)) return;
    visited.add(value);
    remaining -= 1;

    const refId = readObjectRefId(value);
    if (refId !== null && !map.has(refId)) {
      map.set(refId, value);
    }

    if (Array.isArray(value)) {
      const maxLen = Math.min(value.length, 80);
      for (let i = 0; i < maxLen && remaining > 0; i += 1) {
        walk(value[i]);
      }
      return;
    }

    let scannedKeys = 0;
    for (const [key, child] of Object.entries(value)) {
      if (isJsonInternalMetaKey(key)) continue;
      walk(child);
      scannedKeys += 1;
      if (scannedKeys >= 100 || remaining <= 0) break;
    }
  };

  walk(root);
  return map;
}

/** 기존 상태를 정리 */
function clearElement(element: HTMLElement) {
  element.innerHTML = '';
}

/** 해당 기능 흐름을 처리 */
function updateHashString(hash: number, input: string): number {
  let next = hash >>> 0;
  for (let i = 0; i < input.length; i += 1) {
    next ^= input.charCodeAt(i);
    next = Math.imul(next, 16777619);
  }
  return next >>> 0;
}

/** 시그니처 비교용 해시를 계산 */
function hashValueForSignature(value: unknown, budget = 1200): string {
  let hash = 2166136261 >>> 0;
  const visited = new WeakSet<object>();

  const walk = (current: unknown, depth: number) => {
    if (budget <= 0) {
      hash = updateHashString(hash, '<budget>');
      return;
    }
    budget -= 1;

    if (current === null) {
      hash = updateHashString(hash, 'null');
      return;
    }

    const currentType = typeof current;
    hash = updateHashString(hash, currentType);

    if (currentType === 'string') {
      hash = updateHashString(hash, String(current));
      return;
    }
    if (
      currentType === 'number' ||
      currentType === 'boolean' ||
      currentType === 'bigint' ||
      currentType === 'symbol'
    ) {
      hash = updateHashString(hash, String(current));
      return;
    }
    if (currentType !== 'object') {
      return;
    }

    const objectValue = current as object;
    if (visited.has(objectValue)) {
      hash = updateHashString(hash, '<cycle>');
      return;
    }
    visited.add(objectValue);

    if (depth > 7) {
      hash = updateHashString(hash, '<depth>');
      return;
    }

    if (Array.isArray(current)) {
      hash = updateHashString(hash, `arr:${current.length}`);
      const maxLen = Math.min(current.length, 48);
      for (let i = 0; i < maxLen; i += 1) {
        hash = updateHashString(hash, `i:${i}`);
        walk(current[i], depth + 1);
        if (budget <= 0) break;
      }
      return;
    }

    const entries = Object.entries(current as Record<string, unknown>);
    hash = updateHashString(hash, `obj:${entries.length}`);
    let scanned = 0;
    for (let i = 0; i < entries.length; i += 1) {
      const [key, child] = entries[i];
      if (isJsonInternalMetaKey(key)) continue;
      hash = updateHashString(hash, `k:${key}`);
      walk(child, depth + 1);
      scanned += 1;
      if (scanned >= 90) break;
      if (budget <= 0) break;
    }
  };

  walk(value, 0);
  return hash.toString(16);
}

/** 파생 데이터나 요약 값을 구성 */
function buildReactComponentDetailRenderSignature(component: ReactComponentInfo): string {
  return [
    component.id,
    component.name,
    component.kind,
    component.domSelector ?? '',
    component.domPath ?? '',
    String(component.hookCount),
    `p:${hashValueForSignature(component.props)}`,
    `h:${hashValueForSignature(component.hooks)}`,
  ].join('|');
}

/** 파생 데이터나 요약 값을 구성 */
function buildReactComponentUpdateFingerprint(
  component: ReactComponentInfo,
  metadataOnly = false,
): string {
  const baseParts = [
    component.id,
    component.parentId ?? '',
    component.name,
    component.kind,
    component.domSelector ?? '',
    component.domPath ?? '',
    String(component.hookCount),
  ];
  if (metadataOnly) {
    return baseParts.join('|');
  }
  return [
    ...baseParts,
    `p:${hashValueForSignature(component.props, 1600)}`,
    `h:${hashValueForSignature(component.hooks, 1600)}`,
  ].join('|');
}

/** 파생 데이터나 요약 값을 구성 */
function buildReactListRenderSignature(
  filterResult: ComponentFilterResult,
  matchedIndexSet: Set<number>,
): string {
  const parts: string[] = [
    componentSearchQuery.trim().toLowerCase(),
    `sel:${selectedReactComponentIndex}`,
    `visible:${filterResult.visibleIndices.length}`,
    `matched:${filterResult.matchedIndices.length}`,
  ];

  filterResult.visibleIndices.forEach((index) => {
    const component = reactComponents[index];
    const matchFlag = matchedIndexSet.has(index) ? '1' : '0';
    const collapsedFlag = collapsedComponentIds.has(component.id) ? '1' : '0';
    parts.push(
      [
        String(index),
        component.id,
        component.parentId ?? '',
        component.name,
        component.kind,
        String(component.depth),
        component.domSelector ? 'dom' : 'no-dom',
        matchFlag,
        collapsedFlag,
      ].join(':'),
    );
  });

  return parts.join('\u001f');
}

/** 표시용 문자열을 포맷 */
function formatPrimitive(value: unknown): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (/^<[a-zA-Z][\w:-]*\s*\/>$/.test(trimmed)) return trimmed;
    return `"${value.length > 60 ? `${value.slice(0, 60)}…` : value}"`;
  }
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint')
    return String(value);
  if (typeof value === 'symbol') return String(value);
  return String(value);
}

/** 조건 여부를 판별 */
function isJsonInternalMetaKey(key: string): boolean {
  return key === '__ecRefId' || key === OBJECT_CLASS_NAME_META_KEY;
}

/** 값을 읽어 검증/변환 */
function readObjectClassNameMeta(value: unknown): string | null {
  if (!isRecord(value)) return null;
  const classNameRaw = value[OBJECT_CLASS_NAME_META_KEY];
  if (typeof classNameRaw !== 'string') return null;
  const className = classNameRaw.trim();
  if (!className || className === 'Object') return null;
  return className;
}

/** 필요한 값/상태를 계산해 반환 */
function getObjectDisplayName(value: unknown): string {
  return readObjectClassNameMeta(value) ?? 'Object';
}

/** 표시용 문자열을 포맷 */
function readDehydratedPreviewText(value: unknown): string {
  if (!isDehydratedToken(value)) return '{…}';
  if (typeof value.preview === 'string' && value.preview.trim()) {
    return value.preview;
  }
  const sizeText =
    typeof value.size === 'number' && Number.isFinite(value.size) ? `(${Math.max(0, Math.floor(value.size))})` : '';
  if (value.valueType === 'array') return `Array${sizeText}`;
  if (value.valueType === 'map') return `Map${sizeText}`;
  if (value.valueType === 'set') return `Set${sizeText}`;
  if (value.valueType === 'object') return `Object${sizeText}`;
  return '{…}';
}

/** 파생 데이터나 요약 값을 구성 */
function buildJsonSummaryPreview(value: unknown, depth = 0, budget = { remaining: 18 }): string {
  if (budget.remaining <= 0) return '…';
  budget.remaining -= 1;

  if (isFunctionToken(value)) return `function ${value.name ?? '(anonymous)'}`;
  if (isCircularRefToken(value)) return `[Circular #${value.refId}]`;
  if (isDehydratedToken(value)) return readDehydratedPreviewText(value);
  if (isMapToken(value)) {
    const size =
      typeof value.size === 'number' && Number.isFinite(value.size)
        ? Math.max(0, Math.floor(value.size))
        : 0;
    const rawEntries = Array.isArray(value.entries) ? value.entries : [];
    if (size === 0 || rawEntries.length === 0) return `Map(${size}) {}`;
    if (depth >= 1) return `Map(${size})`;

    const maxLen = Math.min(rawEntries.length, 2);
    const parts: string[] = [];
    for (let i = 0; i < maxLen; i += 1) {
      const pair = readMapTokenEntryPair(rawEntries[i]);
      parts.push(
        `${buildJsonSummaryPreview(pair.key, depth + 1, budget)} => ${buildJsonSummaryPreview(pair.value, depth + 1, budget)}`,
      );
      if (budget.remaining <= 0) break;
    }
    const suffix = size > maxLen ? ', …' : '';
    return `Map(${size}) {${parts.join(', ')}${suffix}}`;
  }
  if (isSetToken(value)) {
    const size =
      typeof value.size === 'number' && Number.isFinite(value.size)
        ? Math.max(0, Math.floor(value.size))
        : 0;
    const rawEntries = Array.isArray(value.entries) ? value.entries : [];
    if (size === 0 || rawEntries.length === 0) return `Set(${size}) {}`;
    if (depth >= 1) return `Set(${size})`;

    const maxLen = Math.min(rawEntries.length, 3);
    const parts: string[] = [];
    for (let i = 0; i < maxLen; i += 1) {
      parts.push(buildJsonSummaryPreview(rawEntries[i], depth + 1, budget));
      if (budget.remaining <= 0) break;
    }
    const suffix = size > maxLen ? ', …' : '';
    return `Set(${size}) {${parts.join(', ')}${suffix}}`;
  }
  if (value === null || typeof value !== 'object') return formatPrimitive(value);

  if (Array.isArray(value)) {
    const collectionMeta = readDisplayCollectionMeta(value);
    if (collectionMeta?.type === 'map') {
      if (collectionMeta.size === 0 || value.length === 0) return `Map(${collectionMeta.size}) {}`;
      if (depth >= 1) return `Map(${collectionMeta.size})`;
      const maxLen = Math.min(value.length, 2);
      const parts: string[] = [];
      for (let i = 0; i < maxLen; i += 1) {
        const pair = readMapTokenEntryPair(value[i]);
        parts.push(
          `${buildJsonSummaryPreview(pair.key, depth + 1, budget)} => ${buildJsonSummaryPreview(pair.value, depth + 1, budget)}`,
        );
        if (budget.remaining <= 0) break;
      }
      const suffix = collectionMeta.size > maxLen ? ', …' : '';
      return `Map(${collectionMeta.size}) {${parts.join(', ')}${suffix}}`;
    }
    if (collectionMeta?.type === 'set') {
      if (collectionMeta.size === 0 || value.length === 0) return `Set(${collectionMeta.size}) {}`;
      if (depth >= 1) return `Set(${collectionMeta.size})`;
      const maxLen = Math.min(value.length, 3);
      const parts: string[] = [];
      for (let i = 0; i < maxLen; i += 1) {
        parts.push(buildJsonSummaryPreview(value[i], depth + 1, budget));
        if (budget.remaining <= 0) break;
      }
      const suffix = collectionMeta.size > maxLen ? ', …' : '';
      return `Set(${collectionMeta.size}) {${parts.join(', ')}${suffix}}`;
    }
    if (value.length === 0) return '[]';
    if (depth >= 1) return `Array(${value.length})`;
    const maxLen = Math.min(value.length, 3);
    const previewItems: string[] = [];
    for (let i = 0; i < maxLen; i += 1) {
      previewItems.push(buildJsonSummaryPreview(value[i], depth + 1, budget));
      if (budget.remaining <= 0) break;
    }
    const suffix = value.length > maxLen ? ', …' : '';
    return `[${previewItems.join(', ')}${suffix}]`;
  }

  const objectName = getObjectDisplayName(value);
  const entries = Object.entries(value as Record<string, unknown>).filter(
    ([key]) => !isJsonInternalMetaKey(key),
  );
  if (entries.length === 0) return objectName === 'Object' ? '{}' : `${objectName} {}`;
  if (depth >= 1) return `${objectName}(${entries.length})`;

  const maxLen = Math.min(entries.length, 3);
  const parts: string[] = [];
  for (let i = 0; i < maxLen; i += 1) {
    const [key, child] = entries[i];
    parts.push(`${key}: ${buildJsonSummaryPreview(child, depth + 1, budget)}`);
    if (budget.remaining <= 0) break;
  }
  const suffix = entries.length > maxLen ? ', …' : '';
  const objectBody = `{${parts.join(', ')}${suffix}}`;
  return objectName === 'Object' ? objectBody : `${objectName} ${objectBody}`;
}

/** 파생 데이터나 요약 값을 구성 */
function buildHookInlinePreview(value: unknown, depth = 0, budget = { remaining: 32 }): string {
  if (budget.remaining <= 0) return '…';
  budget.remaining -= 1;

  if (isFunctionToken(value)) {
    const fnName = typeof value.name === 'string' ? value.name.trim() : '';
    return fnName ? `${fnName}() {}` : '() => {}';
  }
  if (isCircularRefToken(value)) return '{…}';
  if (isDehydratedToken(value)) return readDehydratedPreviewText(value);
  if (isMapToken(value)) {
    const size =
      typeof value.size === 'number' && Number.isFinite(value.size)
        ? Math.max(0, Math.floor(value.size))
        : 0;
    const rawEntries = Array.isArray(value.entries) ? value.entries : [];
    if (size === 0 || rawEntries.length === 0) return `Map(${size}) {}`;
    if (depth >= 1) return `Map(${size})`;
    const maxLen = Math.min(rawEntries.length, 2);
    const parts: string[] = [];
    for (let i = 0; i < maxLen; i += 1) {
      const pair = readMapTokenEntryPair(rawEntries[i]);
      parts.push(
        `${buildHookInlinePreview(pair.key, depth + 1, budget)} => ${buildHookInlinePreview(pair.value, depth + 1, budget)}`,
      );
      if (budget.remaining <= 0) break;
    }
    const suffix = size > maxLen ? ', …' : '';
    return `Map(${size}) {${parts.join(', ')}${suffix}}`;
  }
  if (isSetToken(value)) {
    const size =
      typeof value.size === 'number' && Number.isFinite(value.size)
        ? Math.max(0, Math.floor(value.size))
        : 0;
    const rawEntries = Array.isArray(value.entries) ? value.entries : [];
    if (size === 0 || rawEntries.length === 0) return `Set(${size}) {}`;
    if (depth >= 1) return `Set(${size})`;
    const maxLen = Math.min(rawEntries.length, 3);
    const parts: string[] = [];
    for (let i = 0; i < maxLen; i += 1) {
      parts.push(buildHookInlinePreview(rawEntries[i], depth + 1, budget));
      if (budget.remaining <= 0) break;
    }
    const suffix = size > maxLen ? ', …' : '';
    return `Set(${size}) {${parts.join(', ')}${suffix}}`;
  }
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (/^<[a-zA-Z][\w:-]*\s*\/>$/.test(trimmed)) return trimmed;
    const text = value.length > 36 ? `${value.slice(0, 36)}…` : value;
    return `"${text}"`;
  }
  if (
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    typeof value === 'bigint' ||
    typeof value === 'symbol'
  ) {
    return String(value);
  }

  if (Array.isArray(value)) {
    const collectionMeta = readDisplayCollectionMeta(value);
    if (collectionMeta?.type === 'map') {
      if (collectionMeta.size === 0 || value.length === 0) return `Map(${collectionMeta.size}) {}`;
      if (depth >= 1) return `Map(${collectionMeta.size})`;
      const maxLen = Math.min(value.length, 2);
      const parts: string[] = [];
      for (let i = 0; i < maxLen; i += 1) {
        const pair = readMapTokenEntryPair(value[i]);
        parts.push(
          `${buildHookInlinePreview(pair.key, depth + 1, budget)} => ${buildHookInlinePreview(pair.value, depth + 1, budget)}`,
        );
        if (budget.remaining <= 0) break;
      }
      const suffix = collectionMeta.size > maxLen ? ', …' : '';
      return `Map(${collectionMeta.size}) {${parts.join(', ')}${suffix}}`;
    }
    if (collectionMeta?.type === 'set') {
      if (collectionMeta.size === 0 || value.length === 0) return `Set(${collectionMeta.size}) {}`;
      if (depth >= 1) return `Set(${collectionMeta.size})`;
      const maxLen = Math.min(value.length, 4);
      const parts: string[] = [];
      for (let i = 0; i < maxLen; i += 1) {
        parts.push(buildHookInlinePreview(value[i], depth + 1, budget));
        if (budget.remaining <= 0) break;
      }
      const suffix = collectionMeta.size > maxLen ? ', …' : '';
      return `Set(${collectionMeta.size}) {${parts.join(', ')}${suffix}}`;
    }
    if (value.length === 0) return '[]';
    if (depth >= 2) return '[…]';
    const maxLen = Math.min(value.length, 9);
    const items: string[] = [];
    for (let i = 0; i < maxLen; i += 1) {
      items.push(buildHookInlinePreview(value[i], depth + 1, budget));
      if (budget.remaining <= 0) break;
    }
    const suffix = value.length > maxLen ? ', …' : '';
    return `[${items.join(', ')}${suffix}]`;
  }

  if (typeof value === 'object') {
    const objectName = getObjectDisplayName(value);
    const entries = Object.entries(value as Record<string, unknown>).filter(
      ([key]) => !isJsonInternalMetaKey(key),
    );
    if (entries.length === 0) return objectName === 'Object' ? '{}' : `${objectName} {}`;
    if (depth >= 1) return `${objectName}(${entries.length})`;
    const maxLen = Math.min(entries.length, 3);
    const parts: string[] = [];
    for (let i = 0; i < maxLen; i += 1) {
      const [key, child] = entries[i];
      parts.push(`${key}: ${buildHookInlinePreview(child, depth + 1, budget)}`);
      if (budget.remaining <= 0) break;
    }
    const suffix = entries.length > maxLen ? ', …' : '';
    const objectBody = `{${parts.join(', ')}${suffix}}`;
    return objectName === 'Object' ? objectBody : `${objectName} ${objectBody}`;
  }

  return String(value);
}

/** 렌더링에 사용할 DOM/데이터 구조를 생성 */
function createHookRowValueNode(
  value: unknown,
  context: JsonRenderContext,
  path: JsonPathSegment[],
): HTMLElement {
  const node = createJsonValueNode(value, 1, {
    ...context,
    path,
  });

  if (node instanceof HTMLDetailsElement) {
    node.classList.add('json-hook-state-node');
  }

  return node;
}

type DisplayPathMap = Record<string, JsonPathSegment>;
type DisplayCollectionType = 'map' | 'set';
interface DisplayCollectionMeta {
  type: DisplayCollectionType;
  size: number;
}

/** 해당 기능 흐름을 처리 */
function makeMapEntryPathSegment(index: number): string {
  return `${MAP_ENTRY_PATH_SEGMENT_PREFIX}${index}`;
}

/** 해당 기능 흐름을 처리 */
function makeSetEntryPathSegment(index: number): string {
  return `${SET_ENTRY_PATH_SEGMENT_PREFIX}${index}`;
}

/** 해당 기능 흐름을 처리 */
function attachDisplayPathMap(target: object, pathMap: DisplayPathMap) {
  try {
    /** UI key/index와 inspected page 실제 경로를 연결한다. */
    Object.defineProperty(target, DISPLAY_PATH_MAP_KEY, {
      value: pathMap,
      enumerable: false,
      configurable: true,
      writable: false,
    });
  } catch (_) {
    /** 확장 불가능한 객체는 매핑을 붙이지 않고 건너뛴다. */
  }
}

/** 해당 기능 흐름을 처리 */
function attachDisplayCollectionMeta(
  target: object,
  collectionType: DisplayCollectionType,
  size: number,
) {
  const normalizedSize =
    Number.isFinite(size) && size >= 0 ? Math.max(0, Math.floor(size)) : 0;
  try {
    Object.defineProperty(target, DISPLAY_COLLECTION_TYPE_KEY, {
      value: collectionType,
      enumerable: false,
      configurable: true,
      writable: false,
    });
    Object.defineProperty(target, DISPLAY_COLLECTION_SIZE_KEY, {
      value: normalizedSize,
      enumerable: false,
      configurable: true,
      writable: false,
    });
  } catch (_) {
    /** 확장 불가능한 객체는 메타를 붙이지 않고 건너뛴다. */
  }
}

/** 값을 읽어 검증/변환 */
function readDisplayCollectionMeta(value: unknown): DisplayCollectionMeta | null {
  if (!value || (typeof value !== 'object' && typeof value !== 'function')) return null;
  if (!(DISPLAY_COLLECTION_TYPE_KEY in (value as object))) return null;

  const typeRaw = (value as Record<string, unknown>)[DISPLAY_COLLECTION_TYPE_KEY];
  const sizeRaw = (value as Record<string, unknown>)[DISPLAY_COLLECTION_SIZE_KEY];
  if (typeRaw !== 'map' && typeRaw !== 'set') return null;

  const normalizedSize =
    typeof sizeRaw === 'number' && Number.isFinite(sizeRaw) && sizeRaw >= 0
      ? Math.max(0, Math.floor(sizeRaw))
      : 0;
  return {
    type: typeRaw,
    size: normalizedSize,
  };
}

/** 값을 읽어 검증/변환 */
function readDisplayPathMap(value: unknown): DisplayPathMap | null {
  if (!value || (typeof value !== 'object' && typeof value !== 'function')) return null;
  if (!(DISPLAY_PATH_MAP_KEY in (value as object))) return null;
  const candidate = (value as Record<string, unknown>)[DISPLAY_PATH_MAP_KEY];
  if (!isRecord(candidate)) return null;
  const out: DisplayPathMap = {};
  Object.entries(candidate).forEach(([key, segment]) => {
    if (typeof segment === 'string' || typeof segment === 'number') {
      out[key] = segment;
    }
  });
  return out;
}

/** 해당 기능 흐름을 처리 */
function resolveDisplayChildPathSegment(
  parentValue: unknown,
  key: string | number,
): JsonPathSegment {
  /** 표시용 key를 원본 inspect 경로 세그먼트로 역매핑한다. */
  const pathMap = readDisplayPathMap(parentValue);
  if (!pathMap) return key;
  const mapped = pathMap[String(key)];
  return typeof mapped === 'string' || typeof mapped === 'number' ? mapped : key;
}

/** 값을 읽어 검증/변환 */
function readMapTokenEntryPair(entry: unknown): { key: unknown; value: unknown } {
  if (Array.isArray(entry)) {
    return {
      key: entry.length > 0 ? entry[0] : undefined,
      value: entry.length > 1 ? entry[1] : undefined,
    };
  }
  if (isRecord(entry) && ('key' in entry || 'value' in entry)) {
    return {
      key: 'key' in entry ? entry.key : undefined,
      value: 'value' in entry ? entry.value : undefined,
    };
  }
  return { key: undefined, value: entry };
}

/** 해당 기능 흐름을 처리 */
function mapTokenToDisplayEntriesArray(value: unknown): unknown[] {
  const out: unknown[] = [];
  if (!isMapToken(value)) return out;

  /** Map을 [key, value] 배열로 변환해 key가 객체/함수여도 구조를 보존한다. */
  const rawEntries = Array.isArray(value.entries) ? value.entries : [];
  const pathMap: DisplayPathMap = {};

  for (let i = 0; i < rawEntries.length; i += 1) {
    const pair = readMapTokenEntryPair(rawEntries[i]);
    out.push([pair.key, pair.value]);
    pathMap[String(i)] = makeMapEntryPathSegment(i);
  }

  const size =
    typeof value.size === 'number' && Number.isFinite(value.size)
      ? Math.max(0, Math.floor(value.size))
      : rawEntries.length;
  if (size > rawEntries.length) {
    out.push(`[+${size - rawEntries.length} more entries]`);
  }
  attachDisplayPathMap(out, pathMap);
  attachDisplayCollectionMeta(out, 'map', size);
  return out;
}

/** UI 상태 또는 문구를 설정 */
function setTokenToDisplayArray(value: unknown): unknown[] {
  if (!isSetToken(value)) return [];
  const rawEntries = Array.isArray(value.entries) ? value.entries : [];
  const out = rawEntries.slice();
  const size =
    typeof value.size === 'number' && Number.isFinite(value.size)
      ? Math.max(0, Math.floor(value.size))
      : rawEntries.length;
  const pathMap: DisplayPathMap = {};
  for (let i = 0; i < out.length; i += 1) {
    pathMap[String(i)] = makeSetEntryPathSegment(i);
  }
  attachDisplayPathMap(out, pathMap);
  attachDisplayCollectionMeta(out, 'set', size);
  return out;
}

/** 입력 데이터를 표시/비교용으로 정규화 */
function normalizeCollectionTokenForDisplay(value: unknown): unknown {
  /** serializer 토큰(map/set)을 UI 친화적인 컬렉션 형태로 변환한다. */
  if (isMapToken(value)) return mapTokenToDisplayEntriesArray(value);
  if (isSetToken(value)) return setTokenToDisplayArray(value);
  return value;
}

/** 렌더링에 사용할 DOM/데이터 구조를 생성 */
function createExpandableValueRow(
  keyEl: HTMLElement,
  valueDetails: HTMLDetailsElement,
  extraClassName?: string,
): HTMLDivElement {
  const row = document.createElement('div');
  row.className = `json-row json-row-expandable${extraClassName ? ` ${extraClassName}` : ''}`;

  const toggleDetailsOpenState = () => {
    valueDetails.open = !valueDetails.open;
  };

  const toggle = createDetailsToggleButton(valueDetails);

  valueDetails.classList.add('json-inline-value');
  keyEl.classList.add('json-key-toggle');
  keyEl.setAttribute('role', 'button');
  keyEl.tabIndex = 0;
  keyEl.setAttribute('aria-expanded', valueDetails.open ? 'true' : 'false');

  keyEl.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    toggleDetailsOpenState();
  });
  keyEl.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    event.stopPropagation();
    toggleDetailsOpenState();
  });

  const syncInlineChildrenOffset = () => {
    if (!valueDetails.open) return;
    const children = valueDetails.querySelector(':scope > .json-children');
    if (!(children instanceof HTMLElement)) return;
    const rowRect = row.getBoundingClientRect();
    const detailsRect = valueDetails.getBoundingClientRect();
    const offset = detailsRect.left - rowRect.left;
    const targetMargin = INLINE_CHILD_INDENT_PX - offset;
    children.style.marginLeft = `${targetMargin}px`;
  };

  const scheduleInlineChildrenOffset = () => {
    requestAnimationFrame(syncInlineChildrenOffset);
  };

  valueDetails.addEventListener('toggle', () => {
    keyEl.setAttribute('aria-expanded', valueDetails.open ? 'true' : 'false');
    scheduleInlineChildrenOffset();
  });
  window.addEventListener('resize', scheduleInlineChildrenOffset);
  if (typeof MutationObserver === 'function') {
    const childrenObserver = new MutationObserver(() => {
      if (!row.isConnected || !valueDetails.open) return;
      scheduleInlineChildrenOffset();
    });
    childrenObserver.observe(valueDetails, { childList: true });
  }
  if (valueDetails.open) {
    scheduleInlineChildrenOffset();
  }

  row.appendChild(toggle);
  row.appendChild(keyEl);
  row.appendChild(document.createTextNode(': '));
  row.appendChild(valueDetails);
  return row;
}

/** 렌더링에 사용할 DOM/데이터 구조를 생성 */
function createDetailsToggleButton(detailsEl: HTMLDetailsElement): HTMLButtonElement {
  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'json-row-toggle';
  toggle.setAttribute('aria-label', 'Toggle row details');

  const syncToggle = () => {
    toggle.textContent = detailsEl.open ? '▾' : '▸';
  };
  syncToggle();

  toggle.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    detailsEl.open = !detailsEl.open;
  });
  detailsEl.addEventListener('toggle', syncToggle);
  return toggle;
}

/** 렌더링에 사용할 DOM/데이터 구조를 생성 */
function createRowToggleSpacer(): HTMLSpanElement {
  const spacer = document.createElement('span');
  spacer.className = 'json-row-toggle-spacer';
  spacer.setAttribute('aria-hidden', 'true');
  return spacer;
}

/** 필요한 값/상태를 계산해 반환 */
function getHookBadgeType(name: string): HookBadgeType | null {
  if (EFFECT_HOOK_NAME_SET.has(name)) return 'effect';
  if (FUNCTION_HOOK_NAME_SET.has(name)) return 'function';
  return null;
}

/** 입력 데이터를 표시/비교용으로 정규화 */
function normalizeHookGroupLabel(label: string): string {
  const trimmed = label.trim();
  if (!trimmed) return '';
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

/** 입력 데이터를 표시/비교용으로 정규화 */
function normalizeHookGroupPath(rawGroupPath: unknown): string[] | null {
  if (!Array.isArray(rawGroupPath)) return null;
  const normalized = rawGroupPath
    .filter((segment): segment is string => typeof segment === 'string')
    .map((segment) => normalizeHookGroupLabel(segment))
    .filter((segment) => Boolean(segment));
  return normalized.length > 0 ? normalized : null;
}

/** 값을 읽어 검증/변환 */
function readHookRowItem(hook: unknown, arrayIndex: number): HookRowItem {
  const hookRecord = isRecord(hook) ? hook : null;
  const hookIndexRaw = hookRecord?.index;
  const hookNameRaw = hookRecord?.name;
  const hookGroupRaw = hookRecord?.group;
  const hookGroupPathRaw = hookRecord?.groupPath;
  const hookState = hookRecord && 'state' in hookRecord ? hookRecord.state : hook;

  const order =
    typeof hookIndexRaw === 'number' && Number.isFinite(hookIndexRaw) && hookIndexRaw >= 0
      ? Math.floor(hookIndexRaw) + 1
      : arrayIndex + 1;
  const rawName =
    typeof hookNameRaw === 'string' && hookNameRaw.trim() ? hookNameRaw.trim() : 'Hook';
  const name = rawName.charAt(0).toUpperCase() + rawName.slice(1);
  const group =
    typeof hookGroupRaw === 'string' && hookGroupRaw.trim()
      ? normalizeHookGroupLabel(hookGroupRaw)
      : null;
  const normalizedGroupPath = normalizeHookGroupPath(hookGroupPathRaw);
  const groupPath = normalizedGroupPath ?? (group ? [group] : null);

  return {
    sourceIndex: arrayIndex,
    order,
    name,
    group,
    groupPath,
    badge: getHookBadgeType(name),
    state: hookState,
  };
}

/** 렌더링에 사용할 DOM/데이터 구조를 생성 */
function createHookGroupNode(title: string): HookGroupTreeNode {
  return {
    type: 'group',
    title,
    children: [],
  };
}

/** 해당 기능 흐름을 처리 */
function pruneEmptyHookGroups(nodes: HookTreeNode[]): HookTreeNode[] {
  const out: HookTreeNode[] = [];
  nodes.forEach((node) => {
    if (node.type === 'item') {
      out.push(node);
      return;
    }
    node.children = pruneEmptyHookGroups(node.children);
    if (node.children.length > 0) {
      out.push(node);
    }
  });
  return out;
}

/** 파생 데이터나 요약 값을 구성 */
function buildExplicitHookTree(items: HookRowItem[]): HookTreeNode[] {
  const root: HookTreeNode[] = [];
  const groupStack: HookGroupTreeNode[] = [];
  let previousPath: string[] = [];

  items.forEach((item) => {
    /** 공통 prefix 스택을 재사용해 중첩 그룹 트리를 안정적으로 구성한다. */
    const currentPath = item.groupPath ? [...item.groupPath] : [];
    let sharedDepth = 0;
    while (
      sharedDepth < previousPath.length &&
      sharedDepth < currentPath.length &&
      previousPath[sharedDepth] === currentPath[sharedDepth]
    ) {
      sharedDepth += 1;
    }

    groupStack.length = sharedDepth;
    let targetChildren = groupStack.length > 0 ? groupStack[groupStack.length - 1].children : root;

    for (let depth = sharedDepth; depth < currentPath.length; depth += 1) {
      const nextGroup = createHookGroupNode(currentPath[depth]);
      targetChildren.push(nextGroup);
      groupStack.push(nextGroup);
      targetChildren = nextGroup.children;
    }

    targetChildren.push({
      type: 'item',
      item,
    });
    previousPath = currentPath;
  });

  return pruneEmptyHookGroups(root);
}

/** 파생 데이터나 요약 값을 구성 */
function buildFallbackHookTree(items: HookRowItem[]): HookTreeNode[] {
  const tree: HookTreeNode[] = [];
  let activeGroup: HookGroupTreeNode | null = null;

  items.forEach((item) => {
    const isBuiltin = BUILTIN_HOOK_NAME_SET.has(item.name);
    if (!isBuiltin) {
      activeGroup = createHookGroupNode(item.name);
      tree.push(activeGroup);
      return;
    }

    const hookNode: HookTreeNode = {
      type: 'item',
      item,
    };
    if (activeGroup) {
      activeGroup.children.push(hookNode);
    } else {
      tree.push(hookNode);
    }
  });

  return pruneEmptyHookGroups(tree);
}

/** 파생 데이터나 요약 값을 구성 */
function buildHookTree(hooks: unknown[]): HookTreeNode[] {
  const normalizedItems = hooks.map((hook, arrayIndex) => readHookRowItem(hook, arrayIndex));
  const hasExplicitGroupPath = normalizedItems.some(
    (item) => item.groupPath && item.groupPath.length > 0,
  );
  if (hasExplicitGroupPath) {
    return buildExplicitHookTree(normalizedItems);
  }
  return buildFallbackHookTree(normalizedItems);
}

/** 생성한 노드를 컨테이너에 추가 */
function appendHookRow(container: HTMLElement, item: HookRowItem, context: JsonRenderContext) {
  const keyEl = document.createElement('span');
  keyEl.className = 'json-key json-hook-key';

  const indexEl = document.createElement('span');
  indexEl.className = 'json-hook-index';
  indexEl.textContent = String(item.order);
  keyEl.appendChild(indexEl);

  const nameEl = document.createElement('span');
  nameEl.className = 'json-hook-name';
  nameEl.textContent = item.name;
  keyEl.appendChild(nameEl);

  if (item.badge) {
    const badgeEl = document.createElement('span');
    badgeEl.className = `json-hook-badge json-hook-badge-${item.badge}`;
    badgeEl.textContent = item.badge === 'effect' ? 'effect' : 'fn';
    keyEl.appendChild(badgeEl);
  }

  const valueNode = createHookRowValueNode(item.state, context, [item.sourceIndex, 'state']);
  if (valueNode instanceof HTMLDetailsElement) {
    container.appendChild(createExpandableValueRow(keyEl, valueNode, 'json-hook-row'));
    return;
  }

  const row = document.createElement('div');
  row.className = 'json-row json-row-with-spacer json-hook-row';
  row.appendChild(createRowToggleSpacer());
  row.appendChild(keyEl);
  row.appendChild(document.createTextNode(': '));
  row.appendChild(valueNode);
  container.appendChild(row);
}

/** 생성한 노드를 컨테이너에 추가 */
function appendHookTree(container: HTMLElement, nodes: HookTreeNode[], context: JsonRenderContext) {
  nodes.forEach((node) => {
    if (node.type === 'item') {
      appendHookRow(container, node.item, context);
      return;
    }

    const groupDetails = document.createElement('details');
    groupDetails.className = 'json-node json-hook-group';
    groupDetails.open = false;

    const groupTitle = document.createElement('summary');
    groupTitle.className = 'json-hook-group-title';
    groupTitle.appendChild(createDetailsToggleButton(groupDetails));
    const groupLabel = document.createElement('span');
    groupLabel.textContent = node.title;
    groupTitle.appendChild(groupLabel);
    groupDetails.appendChild(groupTitle);

    const groupChildren = document.createElement('div');
    groupChildren.className = 'json-children json-hook-group-children';
    appendHookTree(groupChildren, node.children, context);
    groupDetails.appendChild(groupChildren);
    container.appendChild(groupDetails);
  });
}

/** 렌더링에 사용할 DOM/데이터 구조를 생성 */
function createJsonValueNode(
  value: unknown,
  depth: number,
  context: JsonRenderContext,
): HTMLElement {
  if (isFunctionToken(value)) {
    const fnName = typeof value.name === 'string' ? value.name.trim() : '';
    const functionText = fnName ? `${fnName}() {}` : '() => {}';

    if (!context.allowInspect) {
      const text = document.createElement('span');
      text.className = 'json-primitive';
      text.textContent = functionText;
      return text;
    }
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'json-link';
    button.textContent = functionText;
    button.addEventListener('click', (event) => {
      event.preventDefault();
      inspectFunctionAtPath(context.component, context.section, context.path);
    });
    return button;
  }

  if (isCircularRefToken(value)) {
    const wrapper = document.createElement('details');
    wrapper.className = 'json-node';

    const summary = document.createElement('summary');
    summary.textContent = '[Circular]';
    wrapper.appendChild(summary);

    let rendered = false;
    const renderCircularTarget = () => {
      if (rendered) return;
      rendered = true;

      const target = context.refMap.get(value.refId);
      if (!target) {
        const notFound = document.createElement('div');
        notFound.className = 'json-row';
        notFound.textContent = '참조 대상을 찾을 수 없습니다.';
        wrapper.appendChild(notFound);
        return;
      }

      if (context.refStack.includes(value.refId)) {
        const loop = document.createElement('div');
        loop.className = 'json-row';
        loop.textContent = '순환 참조가 반복되어 더 이상 확장하지 않습니다.';
        wrapper.appendChild(loop);
        return;
      }

      const nested = createJsonValueNode(target, depth + 1, {
        ...context,
        refStack: [...context.refStack, value.refId],
        allowInspect: false,
      });
      wrapper.appendChild(nested);
    };

    wrapper.addEventListener('toggle', () => {
      if (wrapper.open) {
        renderCircularTarget();
      }
    });

    return wrapper;
  }

  if (isDehydratedToken(value)) {
    const canRuntimeInspect =
      context.allowInspect &&
      (context.section === 'props' || context.section === 'hooks') &&
      (context.path.length > 0 || depth === 0);
    if (!canRuntimeInspect) {
      const text = document.createElement('span');
      text.className = 'json-primitive';
      text.textContent = readDehydratedPreviewText(value);
      return text;
    }

    const details = document.createElement('details');
    details.className = 'json-node';

    const summary = document.createElement('summary');
    const previewText = readDehydratedPreviewText(value);
    const metaText = typeof value.reason === 'string' && value.reason ? value.reason : null;
    if (metaText) {
      const meta = document.createElement('span');
      meta.className = 'json-summary-meta';
      meta.textContent = metaText;
      summary.appendChild(meta);
      summary.appendChild(document.createTextNode(' '));
    }
    const preview = document.createElement('span');
    preview.className = 'json-summary-preview';
    preview.textContent = previewText;
    summary.appendChild(preview);
    details.appendChild(summary);

    let runtimeRefreshInFlight = false;
    let runtimeRefreshDone = false;
    details.addEventListener('toggle', () => {
      if (!details.open || runtimeRefreshInFlight || runtimeRefreshDone) return;
      runtimeRefreshInFlight = true;
      details.classList.add('json-loading');

      fetchSerializedValueAtPath(
        context.component,
        context.section,
        context.path,
        (nextValue) => {
          runtimeRefreshInFlight = false;
          details.classList.remove('json-loading');
          if (nextValue === null || !details.isConnected) return;

          runtimeRefreshDone = true;
          const normalized = normalizeCollectionTokenForDisplay(nextValue);
          const replacementNode = createJsonValueNode(normalized, depth, context);
          details.replaceWith(replacementNode);

          if (
            replacementNode instanceof HTMLDetailsElement &&
            !isDehydratedToken(normalized)
          ) {
            replacementNode.open = true;
          }
        },
      );
    });

    return details;
  }

  const normalizedCollectionValue = normalizeCollectionTokenForDisplay(value);
  if (normalizedCollectionValue !== value) {
    return createJsonValueNode(normalizedCollectionValue, depth, context);
  }

  if (normalizedCollectionValue === null || typeof normalizedCollectionValue !== 'object') {
    const primitive = document.createElement('span');
    primitive.className = 'json-primitive';
    primitive.textContent = formatPrimitive(normalizedCollectionValue);
    return primitive;
  }

  const details = document.createElement('details');
  details.className = 'json-node';

  const summary = document.createElement('summary');
  let currentValue: unknown = normalizedCollectionValue;
  /** 펼칠 때 실제 런타임 값을 재조회해 stale 데이터를 줄인다. */
  const shouldRuntimeRefreshOnExpand =
    context.allowInspect &&
    context.path.length > 0 &&
    (context.section === 'props' || context.section === 'hooks');
  let runtimeRefreshAttempted = false;
  let runtimeRefreshInFlight = false;

  const setSummaryContent = (
    metaText: string | null,
    previewText: string,
    previewClassName?: string,
  ) => {
    while (summary.firstChild) {
      summary.removeChild(summary.firstChild);
    }

    if (metaText) {
      const meta = document.createElement('span');
      meta.className = 'json-summary-meta';
      meta.textContent = metaText;
      summary.appendChild(meta);
      if (previewText) {
        summary.appendChild(document.createTextNode(' '));
      }
    }

    const preview = document.createElement('span');
    preview.className = previewClassName ?? 'json-summary-preview';
    preview.textContent = previewText;
    summary.appendChild(preview);
  };

  const applySummaryText = () => {
    if (context.section === 'hooks') {
      const preview = buildHookInlinePreview(currentValue);
      setSummaryContent(null, preview);
      return;
    }
    if (Array.isArray(currentValue)) {
      const collectionMeta = readDisplayCollectionMeta(currentValue);
      const preview = buildJsonSummaryPreview(currentValue);
      if (collectionMeta?.type === 'map') {
        setSummaryContent(`Map(${collectionMeta.size})`, preview);
        return;
      }
      if (collectionMeta?.type === 'set') {
        setSummaryContent(`Set(${collectionMeta.size})`, preview);
        return;
      }
      setSummaryContent(`Array(${currentValue.length})`, preview);
      return;
    }
    const visibleKeyCount =
      currentValue && typeof currentValue === 'object'
        ? Object.keys(currentValue as Record<string, unknown>).filter(
            (key) => !isJsonInternalMetaKey(key),
          )
            .length
        : 0;
    const objectName = getObjectDisplayName(currentValue);
    const preview = buildJsonSummaryPreview(currentValue);
    setSummaryContent(`${objectName}(${visibleKeyCount})`, preview);
  };
  applySummaryText();
  details.appendChild(summary);

  let renderedChildren = false;
  const clearRenderedChildren = () => {
    while (details.lastElementChild && details.lastElementChild !== summary) {
      details.removeChild(details.lastElementChild);
    }
    renderedChildren = false;
  };
  const renderChildren = () => {
    if (renderedChildren) return;
    renderedChildren = true;

    const children = document.createElement('div');
    children.className = 'json-children';
    const sourceValue = currentValue;
    if (sourceValue === null || typeof sourceValue !== 'object') {
      const row = document.createElement('div');
      row.className = 'json-row';
      row.appendChild(
        createJsonValueNode(sourceValue, depth + 1, {
          ...context,
          allowInspect: false,
        }),
      );
      children.appendChild(row);
      details.appendChild(children);
      return;
    }
    const entries = Array.isArray(sourceValue)
      ? sourceValue.map((item, index) => [index, item] as const)
      : Object.entries(sourceValue as Record<string, unknown>).filter(
          ([key]) => !isJsonInternalMetaKey(key),
        );

    if (entries.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'json-row';
      empty.textContent = '(empty)';
      children.appendChild(empty);
    } else {
      entries.forEach(([key, childValue]) => {
        /** Map/Set 표시 변환이 있어도 실제 inspect path는 원본 경로를 사용한다. */
        const childPathSegment = resolveDisplayChildPathSegment(sourceValue, key);
        const childNode = createJsonValueNode(childValue, depth + 1, {
          ...context,
          path: [...context.path, childPathSegment],
        });

        if (childNode instanceof HTMLDetailsElement) {
          const keyEl = document.createElement('span');
          keyEl.className = 'json-key';
          keyEl.textContent = String(key);
          children.appendChild(createExpandableValueRow(keyEl, childNode));
          return;
        }

        const row = document.createElement('div');
        row.className = 'json-row json-row-with-spacer';
        row.appendChild(createRowToggleSpacer());

        const keyEl = document.createElement('span');
        keyEl.className = 'json-key';
        keyEl.textContent = String(key);
        row.appendChild(keyEl);
        row.appendChild(document.createTextNode(': '));
        row.appendChild(childNode);
        children.appendChild(row);
      });
    }

    details.appendChild(children);
  };

  details.addEventListener('toggle', () => {
    if (details.open) {
      renderChildren();
      if (shouldRuntimeRefreshOnExpand && !runtimeRefreshAttempted && !runtimeRefreshInFlight) {
        runtimeRefreshAttempted = true;
        runtimeRefreshInFlight = true;
        details.classList.add('json-loading');
        fetchSerializedValueAtPath(
          context.component,
          context.section,
          context.path,
          (nextValue) => {
            runtimeRefreshInFlight = false;
            details.classList.remove('json-loading');
            if (nextValue === null || !details.isConnected) return;
            currentValue = normalizeCollectionTokenForDisplay(nextValue);
            applySummaryText();
            clearRenderedChildren();
            if (details.open) {
              renderChildren();
            }
          },
        );
      }
    }
  });
  if (depth < 1) {
    details.open = true;
    renderChildren();
  }
  return details;
}

/** 렌더링에 사용할 DOM/데이터 구조를 생성 */
function createJsonSection(
  title: string,
  value: unknown,
  component: ReactComponentInfo,
  sectionKind: JsonSectionKind,
): HTMLElement {
  const sectionEl = document.createElement('div');
  sectionEl.className = 'json-section';

  const sectionTitle = document.createElement('div');
  sectionTitle.className = 'json-section-title';
  sectionTitle.textContent = title;
  sectionEl.appendChild(sectionTitle);

  const refMap = collectRefMap(value);
  const baseContext: JsonRenderContext = {
    component,
    section: sectionKind,
    path: [],
    refMap,
    refStack: [],
    allowInspect: true,
  };

  if (sectionKind === 'hooks' && Array.isArray(value)) {
    const hooksRows = document.createElement('div');
    hooksRows.className = 'json-children';

    if (value.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'json-row';
      empty.textContent = '(empty)';
      hooksRows.appendChild(empty);
    } else {
      const tree = buildHookTree(value);
      appendHookTree(hooksRows, tree, baseContext);
    }

    sectionEl.appendChild(hooksRows);
    return sectionEl;
  }

  sectionEl.appendChild(createJsonValueNode(value, 0, baseContext));
  return sectionEl;
}

/** 데이터를 순회해 수집 */
function collectSearchTokens(
  value: unknown,
  output: string[],
  budget: { remaining: number },
  depth = 0,
) {
  if (budget.remaining <= 0 || depth > 3) return;
  if (value == null) return;

  if (typeof value === 'string') {
    output.push(value);
    budget.remaining -= 1;
    return;
  }
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
    output.push(String(value));
    budget.remaining -= 1;
    return;
  }
  if (isFunctionToken(value)) {
    output.push(value.name ?? 'function');
    budget.remaining -= 1;
    return;
  }
  if (isCircularRefToken(value)) {
    output.push(`ref${value.refId}`);
    budget.remaining -= 1;
    return;
  }
  if (isDehydratedToken(value)) {
    output.push(readDehydratedPreviewText(value));
    if (typeof value.reason === 'string' && value.reason) {
      output.push(value.reason);
    }
    budget.remaining -= 1;
    return;
  }
  if (typeof value !== 'object') return;

  if (Array.isArray(value)) {
    const maxLen = Math.min(value.length, 40);
    for (let i = 0; i < maxLen; i += 1) {
      collectSearchTokens(value[i], output, budget, depth + 1);
      if (budget.remaining <= 0) break;
    }
    return;
  }

  const entries = Object.entries(value as Record<string, unknown>);
  const filteredEntries = entries.filter(([key]) => !isJsonInternalMetaKey(key));
  const maxLen = Math.min(filteredEntries.length, 48);
  for (let i = 0; i < maxLen; i += 1) {
    const [key, child] = filteredEntries[i];
    output.push(key);
    budget.remaining -= 1;
    if (budget.remaining <= 0) break;
    collectSearchTokens(child, output, budget, depth + 1);
    if (budget.remaining <= 0) break;
  }
}

/** 파생 데이터나 요약 값을 구성 */
function buildComponentSearchText(component: ReactComponentInfo, includeDataTokens = true): string {
  const tokens: string[] = [
    component.name,
    component.kind,
    component.domTagName ?? '',
    component.domSelector ?? '',
    component.domPath ?? '',
  ];
  if (!includeDataTokens) {
    return tokens.join(' ').toLowerCase();
  }
  const budget = { remaining: 220 };
  collectSearchTokens(component.props, tokens, budget);
  collectSearchTokens(component.hooks, tokens, budget);
  return tokens.join(' ').toLowerCase();
}

/** 필요한 값/상태를 계산해 반환 */
function getComponentFilterResult(): ComponentFilterResult {
  const normalized = componentSearchQuery.trim().toLowerCase();
  if (!normalized) {
    return {
      visibleIndices: reactComponents.map((_, index) => index),
      matchedIndices: reactComponents.map((_, index) => index),
    };
  }

  const terms = normalized.split(/\s+/).filter(Boolean);
  if (terms.length === 0) {
    return {
      visibleIndices: reactComponents.map((_, index) => index),
      matchedIndices: reactComponents.map((_, index) => index),
    };
  }

  if (componentSearchTexts.length !== reactComponents.length) {
    componentSearchTexts = reactComponents.map((component) =>
      buildComponentSearchText(component, componentSearchIncludeDataTokens),
    );
  }

  const matchedIndices: number[] = [];
  for (let index = 0; index < reactComponents.length; index += 1) {
    const haystack = componentSearchTexts[index] ?? '';
    const matched = terms.every((term) => haystack.includes(term));
    if (matched) matchedIndices.push(index);
  }

  if (matchedIndices.length === 0) {
    return { visibleIndices: [], matchedIndices: [] };
  }

  const idToIndex = new Map<string, number>();
  reactComponents.forEach((component, index) => {
    idToIndex.set(component.id, index);
  });

  const visibleSet = new Set<number>();
  matchedIndices.forEach((matchIndex) => {
    let currentIndex: number | undefined = matchIndex;
    let guard = 0;
    while (currentIndex !== undefined && guard < 220) {
      if (visibleSet.has(currentIndex)) break;
      visibleSet.add(currentIndex);

      const parentId = reactComponents[currentIndex].parentId;
      if (!parentId) break;
      currentIndex = idToIndex.get(parentId);
      guard += 1;
    }
  });

  const visibleIndices = reactComponents
    .map((_, index) => index)
    .filter((index) => visibleSet.has(index));

  return { visibleIndices, matchedIndices };
}

/** 파생 데이터나 요약 값을 구성 */
function buildComponentIndexById(): Map<string, number> {
  const idToIndex = new Map<string, number>();
  reactComponents.forEach((component, index) => {
    idToIndex.set(component.id, index);
  });
  return idToIndex;
}

/** 부모 경로를 확장 */
function expandAncestorPath(index: number, idToIndex: Map<string, number>) {
  let parentId = reactComponents[index]?.parentId ?? null;
  let guard = 0;
  while (parentId && guard < 220) {
    collapsedComponentIds.delete(parentId);
    const parentIndex = idToIndex.get(parentId);
    if (parentIndex === undefined) break;
    parentId = reactComponents[parentIndex].parentId;
    guard += 1;
  }
}

/** 부모 경로를 확장 */
function expandAncestorPaths(indices: number[]) {
  if (indices.length === 0) return;
  const idToIndex = buildComponentIndexById();
  indices.forEach((index) => {
    expandAncestorPath(index, idToIndex);
  });
}

/** 현재 상태 스냅샷을 만든 */
function snapshotCollapsedIds(): Set<string> {
  if (collapsedComponentIds.size === 0 || reactComponents.length === 0) {
    return new Set<string>();
  }

  return new Set<string>(collapsedComponentIds);
}

/** 이전 상태를 복원 */
function restoreCollapsedById(ids: Set<string>) {
  collapsedComponentIds = new Set<string>();
  if (ids.size === 0 || reactComponents.length === 0) return;

  const availableIds = new Set<string>(reactComponents.map((component) => component.id));
  ids.forEach((id) => {
    if (availableIds.has(id)) {
      collapsedComponentIds.add(id);
    }
  });
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

/** 비동기 상세 데이터를 요청 */
function requestSelectedComponentDetail(component: ReactComponentInfo) {
  const componentId = component.id;
  if (!componentId) return;
  if (detailFetchInFlight) {
    detailFetchQueuedComponentId = componentId;
    return;
  }

  const lastFailedAt = detailFetchLastFailedAtById.get(componentId);
  if (lastFailedAt && Date.now() - lastFailedAt < DETAIL_FETCH_RETRY_COOLDOWN_MS) {
    return;
  }

  const lookup = getLookupForRuntimeRefresh();
  const selector = component.domSelector ?? lookup.selector;
  const pickPoint = component.domSelector ? undefined : lookup.pickPoint;
  detailFetchInFlight = true;

  callInspectedPageAgent(
    'reactInspect',
    {
      selector,
      pickPoint: pickPoint ?? null,
      includeSerializedData: false,
      selectedComponentId: componentId,
    },
    (res, errorText) => {
      const finish = () => {
        detailFetchInFlight = false;

        const queuedComponentId = detailFetchQueuedComponentId;
        detailFetchQueuedComponentId = null;
        if (!queuedComponentId || queuedComponentId === componentId) return;
        const queuedComponent = reactComponents.find(
          (candidate) => candidate.id === queuedComponentId,
        );
        if (!queuedComponent || queuedComponent.hasSerializedData !== false) return;
        requestSelectedComponentDetail(queuedComponent);
      };

      const selected =
        selectedReactComponentIndex >= 0 ? reactComponents[selectedReactComponentIndex] : null;
      const isCurrentSelection = selected?.id === componentId;

      if (errorText) {
        detailFetchLastFailedAtById.set(componentId, Date.now());
        if (isCurrentSelection) {
          setReactDetailEmpty(`상세 정보 조회 실패: ${errorText}`);
        }
        finish();
        return;
      }

      if (!isReactInspectResult(res)) {
        const reason = '응답 형식 오류';
        detailFetchLastFailedAtById.set(componentId, Date.now());
        if (isCurrentSelection) {
          setReactDetailEmpty(`상세 정보 조회 실패: ${reason}`);
        }
        finish();
        return;
      }

      const detailedComponent = res.components.find((candidate) => candidate.id === componentId);
      if (!detailedComponent || detailedComponent.hasSerializedData === false) {
        detailFetchLastFailedAtById.set(componentId, Date.now());
        if (isCurrentSelection) {
          setReactDetailEmpty('선택 컴포넌트를 갱신하지 못했습니다. 다시 선택해 주세요.');
        }
        finish();
        return;
      }

      const applied = applySelectedComponentDetail({
        ok: true,
        componentId,
        props: detailedComponent.props,
        hooks: detailedComponent.hooks,
        hookCount: detailedComponent.hookCount,
      });
      if (applied) {
        detailFetchLastFailedAtById.delete(componentId);
      } else {
        detailFetchLastFailedAtById.set(componentId, Date.now());
        if (isCurrentSelection) {
          setReactDetailEmpty('선택 컴포넌트를 갱신하지 못했습니다. 다시 선택해 주세요.');
        }
      }

      finish();
    },
  );
}

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
    const lastFailedAt = detailFetchLastFailedAtById.get(component.id);
    if (lastFailedAt && Date.now() - lastFailedAt < DETAIL_FETCH_RETRY_COOLDOWN_MS) {
      setReactDetailEmpty('상세 정보가 커서 지연됩니다. 잠시 후 다시 선택하세요.');
    } else {
      setReactDetailEmpty('컴포넌트 상세 정보 조회 중…');
      requestSelectedComponentDetail(component);
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
  detailFetchInFlight = false;
  detailFetchQueuedComponentId = null;
  detailFetchLastFailedAtById = new Map<string, number>();
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
      if (errorText) {
        resetReactInspector(`실행 오류: ${errorText}`, true);
        finish();
        return;
      }
      if (isRecord(res) && 'error' in res) {
        resetReactInspector(`오류: ${String(res.error ?? '알 수 없는 오류')}`, true);
        finish();
        return;
      }
      if (!isReactInspectResult(res)) {
        resetReactInspector('React 분석 결과 형식이 올바르지 않습니다.', true);
        finish();
        return;
      }
      applyReactInspectResult(res, {
        preserveSelection: options.preserveSelection,
        preserveCollapsed: options.preserveCollapsed,
        highlightSelection: options.highlightSelection,
        scrollSelectionIntoView: options.scrollSelectionIntoView,
        expandSelectionAncestors: options.expandSelectionAncestors,
        lightweight: options.lightweight,
        trackUpdates: options.trackUpdates,
        refreshDetail: options.refreshDetail,
        statusText: options.statusText,
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

/** 지연 실행을 예약 */
function scheduleRuntimeRefresh(background = true, minDelayMs = 0) {
  if (runtimeRefreshTimer !== null) return;
  const delay = Math.max(RUNTIME_REFRESH_DEBOUNCE_MS, minDelayMs);
  runtimeRefreshTimer = window.setTimeout(() => {
    runtimeRefreshTimer = null;
    refreshReactRuntime(background);
  }, delay);
}

/**
 * 런타임 변경 이벤트에 반응하는 자동 갱신 루프.
 * - in-flight 중복 호출은 queue 플래그로 합친다.
 * - background 모드에서는 최소 간격을 강제해 과도한 재조회 폭주를 막는다.
 */
function refreshReactRuntime(background = true) {
  if (pickerModeActive) return;
  if (runtimeRefreshInFlight) {
    runtimeRefreshQueued = true;
    return;
  }

  if (background) {
    const elapsed = Date.now() - runtimeLastRefreshAt;
    const remaining = RUNTIME_REFRESH_MIN_INTERVAL_MS - elapsed;
    if (remaining > 0) {
      scheduleRuntimeRefresh(true, remaining);
      return;
    }
  }

  runtimeRefreshInFlight = true;
  runtimeLastRefreshAt = Date.now();
  const lookup = getLookupForRuntimeRefresh();
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
    onDone: () => {
      runtimeRefreshInFlight = false;
      if (runtimeRefreshQueued) {
        runtimeRefreshQueued = false;
        scheduleRuntimeRefresh(true);
      }
    },
  });
}

/** 이벤트를 처리 */
function onInspectedPageNavigated(url: string) {
  lastReactLookup = null;
  runtimeRefreshInFlight = false;
  runtimeRefreshQueued = false;
  if (runtimeRefreshTimer !== null) {
    window.clearTimeout(runtimeRefreshTimer);
    runtimeRefreshTimer = null;
  }
  runtimeLastRefreshAt = 0;
  setElementOutput(`페이지 이동 감지: ${url}`);
  setDomTreeStatus('페이지 변경 감지됨. 요소를 선택하면 DOM 트리를 표시합니다.');
  setDomTreeEmpty('요소를 선택하면 DOM 트리를 표시합니다.');
  refreshReactRuntime(false);
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
    scheduleRuntimeRefresh(true);
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
  initWorkspaceLayoutManager();
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
    if (workspacePanelBodySizeObserver) {
      workspacePanelBodySizeObserver.disconnect();
      workspacePanelBodySizeObserver = null;
    }
    if (destroyWheelScrollFallback) {
      destroyWheelScrollFallback();
      destroyWheelScrollFallback = null;
    }
    stopWorkspaceSplitResize(false);
    if (runtimeRefreshTimer !== null) {
      window.clearTimeout(runtimeRefreshTimer);
      runtimeRefreshTimer = null;
    }
    chrome.devtools.network.onNavigated.removeListener(onInspectedPageNavigated);
  });
  refreshReactRuntime(false);
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
