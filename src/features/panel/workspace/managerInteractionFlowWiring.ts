import { isWorkspacePanelId, type WorkspacePanelId } from '../workspacePanels';
import type {
  WorkspaceDropTarget,
  WorkspaceNodePath,
  WorkspacePanelState,
} from './layout/layoutModel';
import {
  parseWorkspaceNodePath,
  WORKSPACE_DOCK_SPLIT_RATIO,
} from './layout/layoutModel';
import {
  computeWorkspaceDockDirection,
  findWorkspacePanelByPoint,
  hideWorkspaceDockPreview,
  showWorkspaceDockPreview,
} from './interaction/dockPreview';
import { createWorkspaceActionHandlers } from './actionHandlers';
import { createWorkspaceManagerInteractionHandlers } from './managerInteractionHandlers';
import { resolveWorkspaceDragOverTarget } from './interaction/dragOverTarget';
import { createWorkspaceDragDropFlow } from './interaction/dragDropFlow';
import {
  applyWorkspaceSplitRatioStyle,
  computeWorkspaceResizeRatioFromPointer,
  createWorkspaceResizeDragStateFromTarget,
} from './interaction/splitResize';
import {
  startWorkspaceSplitResizeSession,
  stopWorkspaceSplitResizeSession,
} from './interaction/splitResizeSession';
import { createWorkspaceResizeFlow } from './interaction/resizeFlow';
import type { WorkspaceInteractionBindingsOptions } from './interactionBindings';

type WorkspaceDragDropFlow = ReturnType<typeof createWorkspaceDragDropFlow>;
type WorkspaceResizeFlow = ReturnType<typeof createWorkspaceResizeFlow>;
type WorkspaceActionHandlers = ReturnType<typeof createWorkspaceActionHandlers>;
type WorkspaceManagerInteractionHandlers = ReturnType<typeof createWorkspaceManagerInteractionHandlers>;

export interface WorkspaceManagerInteractionFlowWiringOptions {
  panelContentEl: HTMLElement;
  workspaceDockPreviewEl: HTMLDivElement;
  workspacePanelElements: Map<WorkspacePanelId, HTMLDetailsElement>;
  applyWorkspaceDockDrop: (draggedPanelId: WorkspacePanelId, dropTarget: WorkspaceDropTarget) => void;
  persistWorkspaceSplitRatio: (splitPath: WorkspaceNodePath, ratio: number) => void;
  getWorkspacePanelStateById: () => Map<WorkspacePanelId, WorkspacePanelState>;
  setWorkspacePanelState: (panelId: WorkspacePanelId, state: WorkspacePanelState) => void;
  toggleWorkspacePanelOpenState: (panelId: WorkspacePanelId) => void;
}

export interface WorkspaceManagerInteractionFlowWiringDependencies {
  createWorkspaceDragDropFlow: (
    args: Parameters<typeof createWorkspaceDragDropFlow>[0],
  ) => WorkspaceDragDropFlow;
  createWorkspaceResizeFlow: (
    args: Parameters<typeof createWorkspaceResizeFlow>[0],
  ) => WorkspaceResizeFlow;
  createWorkspaceActionHandlers: (
    options: Parameters<typeof createWorkspaceActionHandlers>[0],
  ) => WorkspaceActionHandlers;
  createWorkspaceManagerInteractionHandlers: (
    options: Parameters<typeof createWorkspaceManagerInteractionHandlers>[0],
  ) => WorkspaceManagerInteractionHandlers;
}

export interface WorkspaceManagerInteractionFlowWiring {
  panelHandlers: WorkspaceInteractionBindingsOptions['panelHandlers'];
  containerHandlers: WorkspaceInteractionBindingsOptions['containerHandlers'];
  stopWorkspaceSplitResize: WorkspaceResizeFlow['stopWorkspaceSplitResize'];
  onWorkspacePanelDragEnd: WorkspaceDragDropFlow['onWorkspacePanelDragEnd'];
}

const DEFAULT_DEPENDENCIES: WorkspaceManagerInteractionFlowWiringDependencies = {
  createWorkspaceDragDropFlow,
  createWorkspaceResizeFlow,
  createWorkspaceActionHandlers,
  createWorkspaceManagerInteractionHandlers,
};

/** manager 내부 drag/resize/action flow 결선을 조립한다. */
export function createWorkspaceManagerInteractionFlowWiring(
  options: WorkspaceManagerInteractionFlowWiringOptions,
  dependencies: WorkspaceManagerInteractionFlowWiringDependencies = DEFAULT_DEPENDENCIES,
): WorkspaceManagerInteractionFlowWiring {
  const workspaceDragDropFlow = dependencies.createWorkspaceDragDropFlow({
    panelContentEl: options.panelContentEl,
    workspacePanelElements: options.workspacePanelElements,
    isWorkspacePanelId,
    findWorkspacePanelByPoint,
    computeWorkspaceDockDirection,
    resolveWorkspaceDragOverTarget,
    hideWorkspaceDockPreview() {
      hideWorkspaceDockPreview(options.workspaceDockPreviewEl);
    },
    showWorkspaceDockPreview(baseRect, direction) {
      showWorkspaceDockPreview(
        options.workspaceDockPreviewEl,
        options.panelContentEl,
        baseRect,
        direction,
      );
    },
    applyWorkspaceDockDrop: options.applyWorkspaceDockDrop,
  });
  const workspaceResizeFlow = dependencies.createWorkspaceResizeFlow({
    createWorkspaceResizeDragStateFromTarget,
    startWorkspaceSplitResizeSession,
    stopWorkspaceSplitResizeSession,
    computeWorkspaceResizeRatioFromPointer,
    applyWorkspaceSplitRatioStyle,
    parseWorkspaceNodePath,
    defaultSplitRatio: WORKSPACE_DOCK_SPLIT_RATIO,
    onPersistSplitRatio: options.persistWorkspaceSplitRatio,
  });
  const workspaceActionHandlers = dependencies.createWorkspaceActionHandlers({
    isWorkspacePanelId,
    getWorkspacePanelStateById: options.getWorkspacePanelStateById,
    toggleWorkspacePanelOpenState: options.toggleWorkspacePanelOpenState,
    setWorkspacePanelState: options.setWorkspacePanelState,
  });

  const workspaceInteractionHandlers = dependencies.createWorkspaceManagerInteractionHandlers({
    workspaceDragDropFlow,
    workspaceResizeFlow,
    workspaceActionHandlers,
  });

  return {
    panelHandlers: workspaceInteractionHandlers.panelHandlers,
    containerHandlers: workspaceInteractionHandlers.containerHandlers,
    stopWorkspaceSplitResize: workspaceResizeFlow.stopWorkspaceSplitResize,
    onWorkspacePanelDragEnd: workspaceDragDropFlow.onWorkspacePanelDragEnd,
  };
}
