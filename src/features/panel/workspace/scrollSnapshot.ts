export interface WorkspaceScrollSnapshot {
  element: HTMLElement;
  top: number;
  left: number;
}

/** 현재 워크스페이스 내 스크롤 위치를 캡처 */
export function captureWorkspaceScrollSnapshots(
  panelContentEl: HTMLElement,
): WorkspaceScrollSnapshot[] {
  const snapshots: WorkspaceScrollSnapshot[] = [];
  const seen = new Set<HTMLElement>();
  const allElements = panelContentEl.querySelectorAll<HTMLElement>('*');
  allElements.forEach((element) => {
    if (seen.has(element)) return;
    if (element.scrollTop === 0 && element.scrollLeft === 0) return;
    const hasScrollableRange =
      element.scrollHeight > element.clientHeight + 1 ||
      element.scrollWidth > element.clientWidth + 1;
    if (!hasScrollableRange) return;
    snapshots.push({
      element,
      top: element.scrollTop,
      left: element.scrollLeft,
    });
    seen.add(element);
  });
  return snapshots;
}

/** 캡처한 스크롤 위치를 복원 */
export function restoreWorkspaceScrollSnapshots(snapshots: WorkspaceScrollSnapshot[]) {
  snapshots.forEach(({ element, top, left }) => {
    if (!element.isConnected) return;
    if (element.scrollTop !== top) {
      element.scrollTop = top;
    }
    if (element.scrollLeft !== left) {
      element.scrollLeft = left;
    }
  });
}
