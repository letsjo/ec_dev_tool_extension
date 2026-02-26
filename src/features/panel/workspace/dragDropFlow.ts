import type { WorkspacePanelId } from "../workspacePanels";
import type { WorkspaceDockDirection, WorkspaceDropTarget } from "./layout/layoutModel";

interface ResolveWorkspaceDragOverTargetResult {
  dropTarget: WorkspaceDropTarget;
  previewRect: DOMRect;
}

interface CreateWorkspaceDragDropFlowArgs {
  panelContentEl: HTMLElement;
  workspacePanelElements: Map<WorkspacePanelId, HTMLDetailsElement>;
  isWorkspacePanelId: (value: string | null | undefined) => value is WorkspacePanelId;
  findWorkspacePanelByPoint: (clientX: number, clientY: number) => HTMLDetailsElement | null;
  computeWorkspaceDockDirection: (
    panelEl: HTMLElement,
    clientX: number,
    clientY: number,
  ) => WorkspaceDockDirection;
  resolveWorkspaceDragOverTarget: (args: {
    panelContentEl: HTMLElement;
    clientX: number;
    clientY: number;
    findWorkspacePanelByPoint: (clientX: number, clientY: number) => HTMLDetailsElement | null;
    computeWorkspaceDockDirection: (
      panelEl: HTMLElement,
      clientX: number,
      clientY: number,
    ) => WorkspaceDockDirection;
  }) => ResolveWorkspaceDragOverTargetResult;
  hideWorkspaceDockPreview: () => void;
  showWorkspaceDockPreview: (baseRect: DOMRect, direction: WorkspaceDockDirection) => void;
  applyWorkspaceDockDrop: (draggedPanelId: WorkspacePanelId, dropTarget: WorkspaceDropTarget) => void;
}

/** workspace drag/drop 이벤트와 내부 상태(dragged panel, drop target)를 관리한다. */
function createWorkspaceDragDropFlow(args: CreateWorkspaceDragDropFlowArgs) {
  const {
    panelContentEl,
    workspacePanelElements,
    isWorkspacePanelId,
    findWorkspacePanelByPoint,
    computeWorkspaceDockDirection,
    resolveWorkspaceDragOverTarget,
    hideWorkspaceDockPreview,
    showWorkspaceDockPreview,
    applyWorkspaceDockDrop,
  } = args;
  let workspaceDragPanelId: WorkspacePanelId | null = null;
  let workspaceDropTarget: WorkspaceDropTarget | null = null;

  function onWorkspacePanelDragStart(event: DragEvent) {
    const summaryEl = event.currentTarget as HTMLElement | null;
    const panelEl = summaryEl?.closest("details.workspace-panel");
    if (!(panelEl instanceof HTMLDetailsElement)) return;
    if (!isWorkspacePanelId(panelEl.id)) return;
    workspaceDragPanelId = panelEl.id;
    workspaceDropTarget = null;
    panelEl.classList.add("workspace-dragging");
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", panelEl.id);
    }
  }

  function onWorkspacePanelDragEnd() {
    workspaceDragPanelId = null;
    workspaceDropTarget = null;
    workspacePanelElements.forEach((panelEl) => panelEl.classList.remove("workspace-dragging"));
    hideWorkspaceDockPreview();
  }

  function onWorkspaceDragOver(event: DragEvent) {
    if (!workspaceDragPanelId) return;
    event.preventDefault();
    const resolution = resolveWorkspaceDragOverTarget({
      panelContentEl,
      clientX: event.clientX,
      clientY: event.clientY,
      findWorkspacePanelByPoint,
      computeWorkspaceDockDirection,
    });
    workspaceDropTarget = resolution.dropTarget;
    showWorkspaceDockPreview(resolution.previewRect, resolution.dropTarget.direction);
  }

  function onWorkspaceDrop(event: DragEvent) {
    if (!workspaceDragPanelId) return;
    event.preventDefault();
    if (workspaceDropTarget) {
      applyWorkspaceDockDrop(workspaceDragPanelId, workspaceDropTarget);
    }
    onWorkspacePanelDragEnd();
  }

  function onWorkspaceDragLeave(event: DragEvent) {
    const nextTarget = event.relatedTarget;
    if (nextTarget instanceof Node && panelContentEl.contains(nextTarget)) return;
    hideWorkspaceDockPreview();
  }

  return {
    onWorkspacePanelDragStart,
    onWorkspacePanelDragEnd,
    onWorkspaceDragOver,
    onWorkspaceDrop,
    onWorkspaceDragLeave,
  };
}

export { createWorkspaceDragDropFlow };
