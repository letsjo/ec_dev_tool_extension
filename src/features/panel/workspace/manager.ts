import { isWorkspacePanelId, WORKSPACE_PANEL_IDS, type WorkspacePanelId } from '../workspacePanels';
import {
  appendPanelToWorkspaceLayout,
  collectPanelIdsFromLayout,
  createDefaultWorkspaceLayout,
  dedupeWorkspaceLayoutPanels,
  getWorkspaceVisiblePanelIds,
  parseWorkspaceLayoutNode,
  parseWorkspaceNodePath,
  pruneWorkspaceLayoutByVisiblePanels,
  removePanelFromWorkspaceLayout,
  stringifyWorkspaceNodePath,
  updateWorkspaceSplitRatioByPath,
  WORKSPACE_DOCK_SPLIT_RATIO,
  type WorkspaceDockDirection,
  type WorkspaceDropTarget,
  type WorkspaceLayoutNode,
  type WorkspaceNodePath,
  type WorkspacePanelState,
} from './layoutModel';
import { applyWorkspaceDockDropToLayout as applyWorkspaceDockDropToLayoutValue } from './dockDropApply';
import {
  computeWorkspaceDockDirection as computeWorkspaceDockDirectionValue,
  findWorkspacePanelByPoint as findWorkspacePanelByPointValue,
  hideWorkspaceDockPreview as hideWorkspaceDockPreviewValue,
  showWorkspaceDockPreview as showWorkspaceDockPreviewValue,
} from './dockPreview';
import {
  collectWorkspacePanelIdsFromDom as collectWorkspacePanelIdsFromDomValue,
  findReusableWorkspaceDomRoot as findReusableWorkspaceDomRootValue,
  getWorkspaceLayoutRootElement as getWorkspaceLayoutRootElementValue,
  isSameWorkspacePanelIdSet as isSameWorkspacePanelIdSetValue,
} from './domReuse';
import {
  captureWorkspaceScrollSnapshots as captureWorkspaceScrollSnapshotsValue,
  restoreWorkspaceScrollSnapshots as restoreWorkspaceScrollSnapshotsValue,
} from './scrollSnapshot';
import {
  syncWorkspacePanelBodySizes as syncWorkspacePanelBodySizesValue,
  syncWorkspaceSplitCollapsedRows as syncWorkspaceSplitCollapsedRowsValue,
} from './panelSizing';
import {
  createWorkspaceSplitElement as createWorkspaceSplitElementValue,
  resetWorkspacePanelSplitClasses as resetWorkspacePanelSplitClassesValue,
} from './layoutDom';
import {
  applyWorkspaceSplitRatioStyle as applyWorkspaceSplitRatioStyleValue,
  computeWorkspaceResizeRatioFromPointer as computeWorkspaceResizeRatioFromPointerValue,
  createWorkspaceResizeDragStateFromTarget as createWorkspaceResizeDragStateFromTargetValue,
  type WorkspaceResizeDragState,
} from './splitResize';
import { readStoredJson, writeStoredJson } from './storage';

const WORKSPACE_LAYOUT_STORAGE_KEY = 'ecDevTool.workspaceLayout.v1';
const WORKSPACE_PANEL_STATE_STORAGE_KEY = 'ecDevTool.workspacePanelState.v1';

export interface WorkspaceLayoutManagerElements {
  panelContentEl: HTMLElement;
  workspacePanelToggleBarEl: HTMLDivElement;
  workspaceDockPreviewEl: HTMLDivElement;
  workspacePanelElements: Map<WorkspacePanelId, HTMLDetailsElement>;
}

export interface WorkspaceLayoutManager {
  destroy: () => void;
}

/**
 * 워크스페이스 레이아웃(토글/드래그/리사이즈/영속화) 상태머신.
 * controller는 이 매니저를 초기화/해제만 수행하고,
 * 상세 이벤트와 DOM patch 파이프라인은 여기서 단일 책임으로 관리한다.
 */
export function createWorkspaceLayoutManager({
  panelContentEl,
  workspacePanelToggleBarEl,
  workspaceDockPreviewEl,
  workspacePanelElements,
}: WorkspaceLayoutManagerElements): WorkspaceLayoutManager {
  let workspaceLayoutRoot: WorkspaceLayoutNode | null = null;
  let workspaceDragPanelId: WorkspacePanelId | null = null;
  let workspaceDropTarget: WorkspaceDropTarget | null = null;
  let workspacePanelStateById = new Map<WorkspacePanelId, WorkspacePanelState>();
  let workspaceResizeDragState: WorkspaceResizeDragState | null = null;
  let workspacePanelBodySizeObserver: ResizeObserver | null = null;

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

  /** 레이아웃/상태를 동기화 */
  function syncWorkspaceSplitCollapsedRows() {
    syncWorkspaceSplitCollapsedRowsValue(panelContentEl);
  }

  /** 현재 워크스페이스 내 스크롤 위치를 캡처 */
  function captureWorkspaceScrollSnapshots() {
    return captureWorkspaceScrollSnapshotsValue(panelContentEl);
  }

  /** 캡처한 스크롤 위치를 복원 */
  function restoreWorkspaceScrollSnapshots(
    snapshots: ReturnType<typeof captureWorkspaceScrollSnapshots>,
  ) {
    restoreWorkspaceScrollSnapshotsValue(snapshots);
  }

  /** 현재 workspace 루트 DOM 노드를 반환 */
  function getWorkspaceLayoutRootElement(): HTMLElement | null {
    return getWorkspaceLayoutRootElementValue(panelContentEl, workspaceDockPreviewEl);
  }

  /** 파생 데이터나 요약 값을 구성 */
  function collectWorkspacePanelIdsFromDom(rootEl: Element | null): Set<WorkspacePanelId> {
    return collectWorkspacePanelIdsFromDomValue(rootEl);
  }

  /** 조건 여부를 판별 */
  function isSameWorkspacePanelIdSet(a: Set<WorkspacePanelId>, b: Set<WorkspacePanelId>): boolean {
    return isSameWorkspacePanelIdSetValue(a, b);
  }

  /** 조건에 맞는 대상을 탐색 */
  function findReusableWorkspaceDomRoot(
    layoutNode: WorkspaceLayoutNode,
    existingRoot: HTMLElement | null,
  ): HTMLElement | null {
    return findReusableWorkspaceDomRootValue(layoutNode, existingRoot);
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
        : createWorkspaceSplitElementValue(layoutNode.axis);

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
      const recreated = createWorkspaceSplitElementValue(layoutNode.axis);
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

  /** 레이아웃/상태를 동기화 */
  function syncWorkspacePanelBodySizes() {
    syncWorkspacePanelBodySizesValue(workspacePanelElements);
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
    hideWorkspaceDockPreviewValue(workspaceDockPreviewEl);
  }

  /** 화면 요소를 렌더링 */
  function showWorkspaceDockPreview(baseRect: DOMRect, direction: WorkspaceDockDirection) {
    showWorkspaceDockPreviewValue(workspaceDockPreviewEl, panelContentEl, baseRect, direction);
  }

  /**
   * 워크스페이스 레이아웃 렌더 파이프라인.
   * 1) 패널 가시 상태를 DOM에 먼저 반영한다.
   * 2) split 트리를 patch(재사용 우선)해서 DOM churn을 최소화한다.
   * 3) 접힘 높이/토글바/패널 body 사이즈/스크롤 위치를 후처리로 복원한다.
   */
  function renderWorkspaceLayout() {
    resetWorkspacePanelSplitClassesValue(workspacePanelElements);
    reconcileWorkspaceLayout();

    WORKSPACE_PANEL_IDS.forEach((panelId) => {
      const panelEl = workspacePanelElements.get(panelId);
      if (!panelEl) return;
      const state = workspacePanelStateById.get(panelId) ?? 'visible';
      panelEl.hidden = state !== 'visible';
      panelEl.dataset.panelState = state;
      updateWorkspacePanelControlState(panelId);
    });

    if (workspaceDockPreviewEl.parentElement !== panelContentEl) {
      panelContentEl.appendChild(workspaceDockPreviewEl);
    }
    if (panelContentEl.firstElementChild !== workspaceDockPreviewEl) {
      panelContentEl.insertBefore(workspaceDockPreviewEl, panelContentEl.firstChild);
    }
    hideWorkspaceDockPreview();

    const scrollSnapshots = captureWorkspaceScrollSnapshots();
    const existingRoot = getWorkspaceLayoutRootElement();
    let nextRoot: HTMLElement;
    if (workspaceLayoutRoot) {
      nextRoot = patchWorkspaceLayoutDomNode(workspaceLayoutRoot, existingRoot, []);
    } else if (existingRoot && existingRoot.classList.contains('workspace-empty')) {
      nextRoot = existingRoot;
    } else {
      const empty = document.createElement('div');
      empty.className = 'workspace-empty';
      empty.textContent = '표시 중인 패널이 없습니다. 하단 footer에서 패널을 다시 켜주세요.';
      nextRoot = empty;
    }

    if (nextRoot.parentElement !== panelContentEl) {
      panelContentEl.insertBefore(nextRoot, workspaceDockPreviewEl.nextSibling);
    } else if (workspaceDockPreviewEl.nextSibling !== nextRoot) {
      panelContentEl.insertBefore(nextRoot, workspaceDockPreviewEl.nextSibling);
    }

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
    return findWorkspacePanelByPointValue(clientX, clientY);
  }

  /** 필요한 값/상태를 계산해 반환 */
  function computeWorkspaceDockDirection(
    panelEl: HTMLElement,
    clientX: number,
    clientY: number,
  ): WorkspaceDockDirection {
    return computeWorkspaceDockDirectionValue(panelEl, clientX, clientY);
  }

  /** 해당 기능 흐름을 처리 */
  function applyWorkspaceDockDrop(draggedPanelId: WorkspacePanelId, dropTarget: WorkspaceDropTarget) {
    const nextLayout = applyWorkspaceDockDropToLayoutValue(
      workspaceLayoutRoot,
      draggedPanelId,
      dropTarget,
    );
    if (!nextLayout.changed) {
      return;
    }
    workspaceLayoutRoot = nextLayout.layoutRoot;
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
    const nextRatio = computeWorkspaceResizeRatioFromPointerValue(state, event);
    if (nextRatio === null) return;
    state.ratio = nextRatio;
    applyWorkspaceSplitRatioStyleValue(state.splitEl, nextRatio);
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
    if (event.button !== 0) return;
    const nextDragState = createWorkspaceResizeDragStateFromTargetValue(event.target);
    if (!nextDragState) return;
    workspaceResizeDragState = nextDragState;

    const dividerEl = nextDragState.splitEl.querySelector<HTMLElement>(
      ':scope > .workspace-split-divider',
    );

    dividerEl?.classList.add('dragging');
    document.body.style.userSelect = 'none';
    document.body.style.cursor = nextDragState.axis === 'row' ? 'col-resize' : 'row-resize';

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

    applyWorkspaceSplitRatioStyleValue(splitEl, nextRatio);
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

  /** 이벤트를 처리 */
  function onWorkspaceActionButtonMouseDown(event: MouseEvent) {
    event.stopPropagation();
  }

  /** 이벤트를 처리 */
  function onWorkspaceActionButtonDragStart(event: DragEvent) {
    event.preventDefault();
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
        button.addEventListener('mousedown', onWorkspaceActionButtonMouseDown);
        button.addEventListener('dragstart', onWorkspaceActionButtonDragStart);
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

  /** 워크스페이스 관련 이벤트/옵저버를 해제한다. */
  function destroy() {
    panelContentEl.removeEventListener('dragover', onWorkspaceDragOver);
    panelContentEl.removeEventListener('drop', onWorkspaceDrop);
    panelContentEl.removeEventListener('dragleave', onWorkspaceDragLeave);
    panelContentEl.removeEventListener('pointerdown', onWorkspaceSplitResizePointerDown);
    panelContentEl.removeEventListener('dblclick', onWorkspaceSplitDividerDoubleClick);
    workspacePanelToggleBarEl.removeEventListener('click', onWorkspacePanelToggleButtonClick);

    workspacePanelElements.forEach((panelEl) => {
      const summaryEl = panelEl.querySelector<HTMLElement>('summary.workspace-panel-summary');
      if (summaryEl) {
        summaryEl.removeEventListener('dragstart', onWorkspacePanelDragStart);
        summaryEl.removeEventListener('dragend', onWorkspacePanelDragEnd);
        summaryEl.removeEventListener('click', onWorkspaceSummaryAction);
        summaryEl.removeEventListener('click', onWorkspaceSummaryClick);
      }
      const actionButtons = panelEl.querySelectorAll<HTMLButtonElement>('.workspace-panel-action');
      actionButtons.forEach((button) => {
        button.removeEventListener('mousedown', onWorkspaceActionButtonMouseDown);
        button.removeEventListener('dragstart', onWorkspaceActionButtonDragStart);
      });
    });

    if (workspacePanelBodySizeObserver) {
      workspacePanelBodySizeObserver.disconnect();
      workspacePanelBodySizeObserver = null;
    }

    stopWorkspaceSplitResize(false);
    hideWorkspaceDockPreview();
    onWorkspacePanelDragEnd();
  }

  initWorkspaceLayoutManager();

  return {
    destroy,
  };
}
