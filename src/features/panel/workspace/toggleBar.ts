import { isWorkspacePanelId, type WorkspacePanelId } from '../workspacePanels';
import type { WorkspacePanelState } from './layout/layoutModel';

/** footer 토글바 버튼 상태(active/aria-pressed)를 현재 panel state로 동기화한다. */
export function renderWorkspacePanelToggleBar(
  workspacePanelToggleBarEl: HTMLDivElement,
  workspacePanelStateById: Map<WorkspacePanelId, WorkspacePanelState>,
) {
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

/** panel summary 토글 버튼(▾/▸) 상태를 panel open 값으로 동기화한다. */
export function updateWorkspacePanelControlState(
  workspacePanelElements: Map<WorkspacePanelId, HTMLDetailsElement>,
  panelId: WorkspacePanelId,
) {
  const panelEl = workspacePanelElements.get(panelId);
  if (!panelEl) return;
  const toggleBtn = panelEl.querySelector<HTMLButtonElement>(
    `.workspace-panel-action[data-panel-action="toggle"][data-panel-target="${panelId}"]`,
  );
  if (!toggleBtn) return;
  toggleBtn.textContent = panelEl.open ? '▾' : '▸';
  toggleBtn.title = panelEl.open ? '접기' : '펼치기';
}
