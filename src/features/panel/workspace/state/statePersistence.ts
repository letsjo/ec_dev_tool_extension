import { WORKSPACE_PANEL_IDS, type WorkspacePanelId } from '../../workspacePanels';
import {
  createDefaultWorkspaceLayout,
  parseWorkspaceLayoutNode,
  type WorkspaceLayoutNode,
  type WorkspacePanelState,
} from '../layout/layoutModel';
import { readStoredJson, writeStoredJson } from './storage';

const WORKSPACE_LAYOUT_STORAGE_KEY = 'ecDevTool.workspaceLayout.v1';
const WORKSPACE_PANEL_STATE_STORAGE_KEY = 'ecDevTool.workspacePanelState.v1';

function serializeWorkspacePanelState(
  workspacePanelStateById: Map<WorkspacePanelId, WorkspacePanelState>,
) {
  return Object.fromEntries(
    WORKSPACE_PANEL_IDS.map((panelId) => [
      panelId,
      workspacePanelStateById.get(panelId) ?? 'visible',
    ]),
  ) as Record<WorkspacePanelId, WorkspacePanelState>;
}

/** workspace panel 상태 + layout 트리를 localStorage에 저장한다. */
export function persistWorkspaceStateSnapshot(
  workspacePanelStateById: Map<WorkspacePanelId, WorkspacePanelState>,
  workspaceLayoutRoot: WorkspaceLayoutNode | null,
) {
  writeStoredJson(
    WORKSPACE_PANEL_STATE_STORAGE_KEY,
    serializeWorkspacePanelState(workspacePanelStateById),
  );
  writeStoredJson(WORKSPACE_LAYOUT_STORAGE_KEY, workspaceLayoutRoot);
}

export interface RestoredWorkspaceStateSnapshot {
  workspacePanelStateById: Map<WorkspacePanelId, WorkspacePanelState>;
  workspaceLayoutRoot: WorkspaceLayoutNode | null;
}

/** localStorage에서 workspace panel 상태 + layout 트리를 복원한다. */
export function restoreWorkspaceStateSnapshot(): RestoredWorkspaceStateSnapshot {
  const storedState = readStoredJson<Record<string, unknown>>(
    WORKSPACE_PANEL_STATE_STORAGE_KEY,
  );
  const workspacePanelStateById = new Map<WorkspacePanelId, WorkspacePanelState>();
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
  const workspaceLayoutRoot =
    parseWorkspaceLayoutNode(storedLayout) ?? createDefaultWorkspaceLayout();

  return {
    workspacePanelStateById,
    workspaceLayoutRoot,
  };
}
