import type { createWorkspaceActionHandlers as createWorkspaceActionHandlersValue } from './actionHandlers';
import type { createWorkspaceDragDropFlow as createWorkspaceDragDropFlowValue } from './interaction/dragDropFlow';
import type { WorkspaceInteractionBindingsOptions } from './interactionBindings';
import type { createWorkspaceResizeFlow as createWorkspaceResizeFlowValue } from './interaction/resizeFlow';

type WorkspaceDragDropFlow = ReturnType<typeof createWorkspaceDragDropFlowValue>;
type WorkspaceResizeFlow = ReturnType<typeof createWorkspaceResizeFlowValue>;
type WorkspaceActionHandlers = ReturnType<typeof createWorkspaceActionHandlersValue>;

interface CreateWorkspaceManagerInteractionHandlersOptions {
  workspaceDragDropFlow: WorkspaceDragDropFlow;
  workspaceResizeFlow: WorkspaceResizeFlow;
  workspaceActionHandlers: WorkspaceActionHandlers;
}

export interface WorkspaceManagerInteractionHandlers {
  panelHandlers: WorkspaceInteractionBindingsOptions['panelHandlers'];
  containerHandlers: WorkspaceInteractionBindingsOptions['containerHandlers'];
}

/** manager 내부 panel/container 이벤트 핸들러 묶음을 생성한다. */
export function createWorkspaceManagerInteractionHandlers(
  options: CreateWorkspaceManagerInteractionHandlersOptions,
): WorkspaceManagerInteractionHandlers {
  return {
    panelHandlers: {
      onPanelDragStart: options.workspaceDragDropFlow.onWorkspacePanelDragStart,
      onPanelDragEnd: options.workspaceDragDropFlow.onWorkspacePanelDragEnd,
      onSummaryAction: options.workspaceActionHandlers.onWorkspaceSummaryAction,
      onSummaryClick: options.workspaceActionHandlers.onWorkspaceSummaryClick,
      onActionButtonMouseDown: options.workspaceActionHandlers.onWorkspaceActionButtonMouseDown,
      onActionButtonDragStart: options.workspaceActionHandlers.onWorkspaceActionButtonDragStart,
    },
    containerHandlers: {
      onWorkspaceDragOver: options.workspaceDragDropFlow.onWorkspaceDragOver,
      onWorkspaceDrop: options.workspaceDragDropFlow.onWorkspaceDrop,
      onWorkspaceDragLeave: options.workspaceDragDropFlow.onWorkspaceDragLeave,
      onWorkspaceSplitResizePointerDown:
        options.workspaceResizeFlow.onWorkspaceSplitResizePointerDown,
      onWorkspaceSplitDividerDoubleClick:
        options.workspaceResizeFlow.onWorkspaceSplitDividerDoubleClick,
      onWorkspacePanelToggleButtonClick:
        options.workspaceActionHandlers.onWorkspacePanelToggleButtonClick,
    },
  };
}
