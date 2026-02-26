import { isWorkspacePanelId } from '../../workspacePanels';
import type {
  WorkspaceDockDirection,
  WorkspaceDropTarget,
} from '../layout/layoutModel';

export interface WorkspaceDragOverResolution {
  dropTarget: WorkspaceDropTarget;
  previewRect: DOMRect;
}

export interface ResolveWorkspaceDragOverTargetOptions {
  panelContentEl: HTMLElement;
  clientX: number;
  clientY: number;
  findWorkspacePanelByPoint: (clientX: number, clientY: number) => HTMLDetailsElement | null;
  computeWorkspaceDockDirection: (
    panelEl: HTMLElement,
    clientX: number,
    clientY: number,
  ) => WorkspaceDockDirection;
}

/** 현재 pointer 좌표 기준 workspace drop target과 preview rect를 계산한다. */
export function resolveWorkspaceDragOverTarget(
  options: ResolveWorkspaceDragOverTargetOptions,
): WorkspaceDragOverResolution {
  const panelEl = options.findWorkspacePanelByPoint(options.clientX, options.clientY);
  if (!panelEl || !isWorkspacePanelId(panelEl.id)) {
    return {
      dropTarget: {
        targetPanelId: null,
        direction: 'center',
      },
      previewRect: options.panelContentEl.getBoundingClientRect(),
    };
  }

  const direction = options.computeWorkspaceDockDirection(
    panelEl,
    options.clientX,
    options.clientY,
  );
  return {
    dropTarget: {
      targetPanelId: panelEl.id,
      direction,
    },
    previewRect: panelEl.getBoundingClientRect(),
  };
}
