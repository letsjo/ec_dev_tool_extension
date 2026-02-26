import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createWorkspaceDragDropFlow } from '../../src/features/panel/workspace/interaction/dragDropFlow';
import { createWorkspaceResizeFlow } from '../../src/features/panel/workspace/interaction/resizeFlow';
import type { WorkspaceDropTarget, WorkspaceNodePath } from '../../src/features/panel/workspace/layout/layoutModel';
import type { WorkspaceResizeDragState } from '../../src/features/panel/workspace/interaction/splitResize';
import type { WorkspacePanelId } from '../../src/features/panel/workspacePanels';

describe('createWorkspaceDragDropFlow', () => {
  const panelId: WorkspacePanelId = 'componentsTreeSection';
  let panelContentEl: HTMLElement;
  let panelEl: HTMLDetailsElement;
  let summaryEl: HTMLElement;
  let workspacePanelElements: Map<WorkspacePanelId, HTMLDetailsElement>;
  let hideWorkspaceDockPreview: ReturnType<typeof vi.fn>;
  let showWorkspaceDockPreview: ReturnType<typeof vi.fn>;
  let applyWorkspaceDockDrop: ReturnType<typeof vi.fn>;
  let resolveWorkspaceDragOverTarget: ReturnType<typeof vi.fn>;
  let flow: ReturnType<typeof createWorkspaceDragDropFlow>;
  let dropTarget: WorkspaceDropTarget;
  let previewRect: DOMRect;

  beforeEach(() => {
    panelContentEl = document.createElement('section');
    panelEl = document.createElement('details');
    panelEl.id = panelId;
    panelEl.className = 'workspace-panel';
    summaryEl = document.createElement('summary');
    panelEl.append(summaryEl);
    panelContentEl.append(panelEl);

    workspacePanelElements = new Map([[panelId, panelEl]]);
    hideWorkspaceDockPreview = vi.fn();
    showWorkspaceDockPreview = vi.fn();
    applyWorkspaceDockDrop = vi.fn();
    dropTarget = {
      targetPanelId: panelId,
      direction: 'left',
    };
    previewRect = new DOMRect(10, 20, 100, 40);
    resolveWorkspaceDragOverTarget = vi.fn(() => ({
      dropTarget,
      previewRect,
    }));

    flow = createWorkspaceDragDropFlow({
      panelContentEl,
      workspacePanelElements,
      isWorkspacePanelId(value): value is WorkspacePanelId {
        return value === panelId;
      },
      findWorkspacePanelByPoint: vi.fn(() => panelEl),
      computeWorkspaceDockDirection: vi.fn(() => 'left'),
      resolveWorkspaceDragOverTarget,
      hideWorkspaceDockPreview,
      showWorkspaceDockPreview,
      applyWorkspaceDockDrop,
    });
  });

  it('starts and ends panel drag state', () => {
    const setData = vi.fn();
    const dataTransfer = {
      effectAllowed: 'none',
      setData,
    } as unknown as DataTransfer;

    flow.onWorkspacePanelDragStart({
      currentTarget: summaryEl,
      dataTransfer,
    } as unknown as DragEvent);

    expect(panelEl.classList.contains('workspace-dragging')).toBe(true);
    expect(dataTransfer.effectAllowed).toBe('move');
    expect(setData).toHaveBeenCalledWith('text/plain', panelId);

    flow.onWorkspacePanelDragEnd();
    expect(panelEl.classList.contains('workspace-dragging')).toBe(false);
    expect(hideWorkspaceDockPreview).toHaveBeenCalledTimes(1);
  });

  it('resolves drop target and applies drop on workspace drop', () => {
    flow.onWorkspacePanelDragStart({
      currentTarget: summaryEl,
      dataTransfer: {
        effectAllowed: 'none',
        setData: vi.fn(),
      } as unknown as DataTransfer,
    } as unknown as DragEvent);

    const onDragOverPreventDefault = vi.fn();
    flow.onWorkspaceDragOver({
      clientX: 120,
      clientY: 88,
      preventDefault: onDragOverPreventDefault,
    } as unknown as DragEvent);

    expect(onDragOverPreventDefault).toHaveBeenCalledTimes(1);
    expect(resolveWorkspaceDragOverTarget).toHaveBeenCalledWith(
      expect.objectContaining({
        panelContentEl,
        clientX: 120,
        clientY: 88,
      }),
    );
    expect(showWorkspaceDockPreview).toHaveBeenCalledWith(previewRect, 'left');

    const onDropPreventDefault = vi.fn();
    flow.onWorkspaceDrop({
      preventDefault: onDropPreventDefault,
    } as unknown as DragEvent);

    expect(onDropPreventDefault).toHaveBeenCalledTimes(1);
    expect(applyWorkspaceDockDrop).toHaveBeenCalledWith(panelId, dropTarget);
    expect(hideWorkspaceDockPreview).toHaveBeenCalledTimes(1);
  });

  it('hides preview only when dragleave exits workspace', () => {
    const insideNode = document.createElement('div');
    panelContentEl.append(insideNode);

    flow.onWorkspaceDragLeave({
      relatedTarget: insideNode,
    } as unknown as DragEvent);
    expect(hideWorkspaceDockPreview).not.toHaveBeenCalled();

    flow.onWorkspaceDragLeave({
      relatedTarget: document.createElement('aside'),
    } as unknown as DragEvent);
    expect(hideWorkspaceDockPreview).toHaveBeenCalledTimes(1);
  });
});

describe('createWorkspaceResizeFlow', () => {
  let splitEl: HTMLElement;
  let dividerEl: HTMLElement;
  let state: WorkspaceResizeDragState;
  let createWorkspaceResizeDragStateFromTarget: ReturnType<typeof vi.fn>;
  let startWorkspaceSplitResizeSession: ReturnType<typeof vi.fn>;
  let stopWorkspaceSplitResizeSession: ReturnType<typeof vi.fn>;
  let computeWorkspaceResizeRatioFromPointer: ReturnType<typeof vi.fn>;
  let applyWorkspaceSplitRatioStyle: ReturnType<typeof vi.fn>;
  let parseWorkspaceNodePath: ReturnType<typeof vi.fn>;
  let onPersistSplitRatio: ReturnType<typeof vi.fn>;
  let flow: ReturnType<typeof createWorkspaceResizeFlow>;

  beforeEach(() => {
    splitEl = document.createElement('section');
    splitEl.dataset.splitPath = 'root.first';
    dividerEl = document.createElement('button');
    dividerEl.className = 'workspace-split-divider';
    splitEl.append(dividerEl);

    state = {
      splitPath: ['root', 'first'],
      axis: 'row',
      splitEl,
      splitRect: new DOMRect(0, 0, 500, 300),
      dividerSize: 8,
      ratio: 0.4,
    };

    createWorkspaceResizeDragStateFromTarget = vi.fn(() => state);
    startWorkspaceSplitResizeSession = vi.fn();
    stopWorkspaceSplitResizeSession = vi.fn();
    computeWorkspaceResizeRatioFromPointer = vi.fn(() => 0.7);
    applyWorkspaceSplitRatioStyle = vi.fn();
    parseWorkspaceNodePath = vi.fn(
      (raw: string) => ['parsed', raw] as unknown as WorkspaceNodePath,
    );
    onPersistSplitRatio = vi.fn();

    flow = createWorkspaceResizeFlow({
      createWorkspaceResizeDragStateFromTarget,
      startWorkspaceSplitResizeSession,
      stopWorkspaceSplitResizeSession,
      computeWorkspaceResizeRatioFromPointer,
      applyWorkspaceSplitRatioStyle,
      parseWorkspaceNodePath,
      defaultSplitRatio: 0.5,
      onPersistSplitRatio,
    });
  });

  it('starts resize on primary button and persists changed ratio on pointer up', () => {
    const onPointerDownPreventDefault = vi.fn();
    flow.onWorkspaceSplitResizePointerDown({
      button: 0,
      target: dividerEl,
      preventDefault: onPointerDownPreventDefault,
    } as unknown as PointerEvent);

    expect(createWorkspaceResizeDragStateFromTarget).toHaveBeenCalledWith(dividerEl);
    expect(startWorkspaceSplitResizeSession).toHaveBeenCalledTimes(1);
    expect(onPointerDownPreventDefault).toHaveBeenCalledTimes(1);

    const onPointerMovePreventDefault = vi.fn();
    const pointerMoveEvent = {
      clientX: 260,
      clientY: 10,
      preventDefault: onPointerMovePreventDefault,
    } as unknown as PointerEvent;
    flow.onWorkspaceSplitResizePointerMove(pointerMoveEvent);

    expect(computeWorkspaceResizeRatioFromPointer).toHaveBeenCalledWith(state, pointerMoveEvent);
    expect(applyWorkspaceSplitRatioStyle).toHaveBeenCalledWith(splitEl, 0.7);
    expect(onPointerMovePreventDefault).toHaveBeenCalledTimes(1);

    flow.onWorkspaceSplitResizePointerUp();
    expect(stopWorkspaceSplitResizeSession).toHaveBeenCalledTimes(1);
    expect(onPersistSplitRatio).toHaveBeenCalledWith(state.splitPath, 0.7);
  });

  it('ignores non-primary pointerdown and skips persist on pointer cancel', () => {
    flow.onWorkspaceSplitResizePointerDown({
      button: 1,
      target: dividerEl,
      preventDefault: vi.fn(),
    } as unknown as PointerEvent);
    expect(startWorkspaceSplitResizeSession).not.toHaveBeenCalled();

    flow.onWorkspaceSplitResizePointerDown({
      button: 0,
      target: dividerEl,
      preventDefault: vi.fn(),
    } as unknown as PointerEvent);
    flow.onWorkspaceSplitResizePointerCancel();

    expect(stopWorkspaceSplitResizeSession).toHaveBeenCalledTimes(1);
    expect(onPersistSplitRatio).not.toHaveBeenCalled();
  });

  it('restores default ratio on divider double click', () => {
    const onDoubleClickPreventDefault = vi.fn();
    flow.onWorkspaceSplitDividerDoubleClick({
      target: dividerEl,
      preventDefault: onDoubleClickPreventDefault,
    } as unknown as MouseEvent);

    expect(parseWorkspaceNodePath).toHaveBeenCalledWith('root.first');
    expect(applyWorkspaceSplitRatioStyle).toHaveBeenCalledWith(splitEl, 0.5);
    expect(onPersistSplitRatio).toHaveBeenCalledWith(['parsed', 'root.first'], 0.5);
    expect(onDoubleClickPreventDefault).toHaveBeenCalledTimes(1);
  });
});
