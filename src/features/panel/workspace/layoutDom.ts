import type { WorkspacePanelId } from '../workspacePanels';

/** split 축(row/column)에 맞는 기본 DOM 골격을 생성한다. */
export function createWorkspaceSplitElement(axis: 'row' | 'column'): HTMLDivElement {
  const splitEl = document.createElement('div');
  splitEl.className = `workspace-split workspace-split-${axis}`;
  splitEl.dataset.splitAxis = axis;

  const firstSlot = document.createElement('div');
  firstSlot.className = 'workspace-split-child workspace-split-child-first';
  splitEl.appendChild(firstSlot);

  const divider = document.createElement('div');
  divider.className = `workspace-split-divider workspace-split-divider-${axis}`;
  divider.setAttribute('role', 'separator');
  divider.setAttribute('aria-orientation', axis === 'row' ? 'vertical' : 'horizontal');
  divider.setAttribute('aria-label', 'Resize workspace panels');
  splitEl.appendChild(divider);

  const secondSlot = document.createElement('div');
  secondSlot.className = 'workspace-split-child workspace-split-child-second';
  splitEl.appendChild(secondSlot);
  return splitEl;
}

/** 패널 노드에 남아 있을 수 있는 split child class 오염을 정리한다. */
export function resetWorkspacePanelSplitClasses(
  workspacePanelElements: Map<WorkspacePanelId, HTMLDetailsElement>,
) {
  workspacePanelElements.forEach((panelEl) => {
    panelEl.classList.remove(
      'workspace-split-child',
      'workspace-split-child-first',
      'workspace-split-child-second',
    );
  });
}
