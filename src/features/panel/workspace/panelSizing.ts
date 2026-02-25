import type { WorkspacePanelId } from '../workspacePanels';

/** 노드가 접혔을 때 필요한 높이를 계산 */
function getWorkspaceNodeCollapsedHeight(
  node: Element | null,
  cache: WeakMap<Element, string | null>,
): string | null {
  if (!(node instanceof Element)) return null;
  if (cache.has(node)) {
    return cache.get(node) ?? null;
  }

  let collapsedHeight: string | null = null;

  if (node instanceof HTMLDetailsElement && node.classList.contains('workspace-panel')) {
    collapsedHeight = node.open ? null : 'var(--workspace-panel-summary-height)';
  } else if (node instanceof HTMLElement && node.classList.contains('workspace-split')) {
    const axis = node.dataset.splitAxis;
    const firstNode = node.querySelector(':scope > .workspace-split-child-first > *');
    const secondNode = node.querySelector(':scope > .workspace-split-child-second > *');
    const firstCollapsedHeight = getWorkspaceNodeCollapsedHeight(firstNode, cache);
    const secondCollapsedHeight = getWorkspaceNodeCollapsedHeight(secondNode, cache);

    if (firstCollapsedHeight && secondCollapsedHeight) {
      if (axis === 'column') {
        collapsedHeight =
          `calc(${firstCollapsedHeight} + var(--workspace-split-divider-size, 10px) + ` +
          `var(--workspace-split-gap, 1px) + var(--workspace-split-gap, 1px) + ` +
          `${secondCollapsedHeight})`;
      } else if (axis === 'row') {
        collapsedHeight = `max(${firstCollapsedHeight}, ${secondCollapsedHeight})`;
      }
    }
  }

  cache.set(node, collapsedHeight);
  return collapsedHeight;
}

/** 레이아웃/상태를 동기화 */
export function syncWorkspaceSplitCollapsedRows(panelContentEl: HTMLElement) {
  const splitElements = panelContentEl.querySelectorAll<HTMLElement>('.workspace-split');
  const collapsedHeightCache = new WeakMap<Element, string | null>();

  splitElements.forEach((splitEl) => {
    if (splitEl.dataset.splitAxis !== 'column') {
      splitEl.style.removeProperty('grid-template-rows');
      return;
    }

    const firstNode = splitEl.querySelector(':scope > .workspace-split-child-first > *');
    const secondNode = splitEl.querySelector(':scope > .workspace-split-child-second > *');
    const firstCollapsedHeight = getWorkspaceNodeCollapsedHeight(firstNode, collapsedHeightCache);
    const secondCollapsedHeight = getWorkspaceNodeCollapsedHeight(secondNode, collapsedHeightCache);
    const dividerSize = 'var(--workspace-split-divider-size, 10px)';

    if (firstCollapsedHeight && secondCollapsedHeight) {
      splitEl.style.gridTemplateRows = `${firstCollapsedHeight} ${dividerSize} ${secondCollapsedHeight}`;
    } else if (firstCollapsedHeight) {
      splitEl.style.gridTemplateRows = `${firstCollapsedHeight} ${dividerSize} minmax(0, 1fr)`;
    } else if (secondCollapsedHeight) {
      splitEl.style.gridTemplateRows = `minmax(0, 1fr) ${dividerSize} ${secondCollapsedHeight}`;
    } else {
      splitEl.style.removeProperty('grid-template-rows');
    }
  });
}

/** 레이아웃/상태를 동기화 */
export function syncWorkspacePanelBodySizes(
  workspacePanelElements: Map<WorkspacePanelId, HTMLDetailsElement>,
) {
  workspacePanelElements.forEach((panelEl) => {
    const bodyEl = panelEl.querySelector<HTMLElement>(':scope > .components-pane-body');
    if (!bodyEl) return;

    if (!panelEl.open || panelEl.hidden) {
      if (bodyEl.style.width !== '0px') {
        bodyEl.style.width = '0px';
      }
      if (bodyEl.style.height !== '0px') {
        bodyEl.style.height = '0px';
      }
      return;
    }

    const summaryEl = panelEl.querySelector<HTMLElement>(':scope > summary.workspace-panel-summary');
    const summaryHeight = summaryEl ? Math.ceil(summaryEl.getBoundingClientRect().height) : 0;
    const width = Math.max(0, Math.floor(panelEl.clientWidth));
    const height = Math.max(0, Math.floor(panelEl.clientHeight - summaryHeight));
    const nextWidth = `${width}px`;
    const nextHeight = `${height}px`;
    if (bodyEl.style.width !== nextWidth) {
      bodyEl.style.width = nextWidth;
    }
    if (bodyEl.style.height !== nextHeight) {
      bodyEl.style.height = nextHeight;
    }
  });
}
