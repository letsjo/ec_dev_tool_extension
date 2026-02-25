import type { WorkspacePanelId } from '../workspacePanels';
import {
  bindWorkspaceContainerInteractions,
  unbindWorkspaceContainerInteractions,
} from './containerBindings';
import {
  bindWorkspacePanelInteractions,
  unbindWorkspacePanelInteractions,
} from './panelBindings';

type WorkspacePanelInteractionHandlers = Parameters<typeof bindWorkspacePanelInteractions>[1];
type WorkspaceContainerInteractionHandlers = Parameters<typeof bindWorkspaceContainerInteractions>[2];

export interface WorkspaceInteractionBindingsOptions {
  panelContentEl: HTMLElement;
  workspacePanelToggleBarEl: HTMLDivElement;
  workspacePanelElements: Map<WorkspacePanelId, HTMLDetailsElement>;
  panelHandlers: WorkspacePanelInteractionHandlers;
  containerHandlers: WorkspaceContainerInteractionHandlers;
}

/** workspace panel/container 이벤트를 묶어서 바인딩하고 해제 함수를 반환한다. */
export function bindWorkspaceInteractionBindings(
  options: WorkspaceInteractionBindingsOptions,
): () => void {
  bindWorkspacePanelInteractions(options.workspacePanelElements, options.panelHandlers);
  bindWorkspaceContainerInteractions(
    options.panelContentEl,
    options.workspacePanelToggleBarEl,
    options.containerHandlers,
  );

  return () => {
    unbindWorkspaceContainerInteractions(
      options.panelContentEl,
      options.workspacePanelToggleBarEl,
      options.containerHandlers,
    );
    unbindWorkspacePanelInteractions(options.workspacePanelElements, options.panelHandlers);
  };
}
