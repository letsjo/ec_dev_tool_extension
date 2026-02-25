import { WORKSPACE_PANEL_IDS, type WorkspacePanelId } from '../workspacePanels';
import type { WorkspacePanelState } from './layoutTypes';

/** 파생 데이터나 요약 값을 구성 */
export function getWorkspaceVisiblePanelIds(
  panelStateById: ReadonlyMap<WorkspacePanelId, WorkspacePanelState>,
): WorkspacePanelId[] {
  return WORKSPACE_PANEL_IDS.filter((panelId) => panelStateById.get(panelId) === 'visible');
}
