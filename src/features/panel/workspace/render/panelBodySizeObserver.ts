import type { WorkspacePanelId } from '../../workspacePanels';

interface CreateWorkspacePanelBodySizeObserverOptions {
  panelContentEl: HTMLElement;
  workspacePanelElements: Map<WorkspacePanelId, HTMLDetailsElement>;
  onResize: () => void;
}

/** workspace panel/body 크기 동기화를 위한 ResizeObserver 생명주기를 관리한다. */
export function createWorkspacePanelBodySizeObserver(
  options: CreateWorkspacePanelBodySizeObserverOptions,
) {
  let panelBodySizeObserver: ResizeObserver | null = null;

  /** 초기화 */
  function start() {
    if (typeof ResizeObserver === 'undefined') return;
    stop();

    panelBodySizeObserver = new ResizeObserver(() => {
      options.onResize();
    });
    panelBodySizeObserver.observe(options.panelContentEl);
    options.workspacePanelElements.forEach((panelEl) => {
      panelBodySizeObserver?.observe(panelEl);
    });
  }

  /** 기존 상태를 정리 */
  function stop() {
    if (!panelBodySizeObserver) return;
    panelBodySizeObserver.disconnect();
    panelBodySizeObserver = null;
  }

  return {
    start,
    stop,
  };
}
