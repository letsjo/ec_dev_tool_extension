interface ReactTreeScrollAnchor {
  previousScrollTop: number;
  previousScrollLeft: number;
  selectedItemSelector: string;
  previousSelectedOffsetTop: number | null;
}

interface ReactTreeScrollAnchorCaptureOptions {
  treePaneEl: HTMLDivElement;
  reactComponentListEl: HTMLDivElement;
  selectedReactComponentIndex: number;
}

interface ReactTreeScrollAnchorRestoreOptions {
  treePaneEl: HTMLDivElement;
  reactComponentListEl: HTMLDivElement;
  anchor: ReactTreeScrollAnchor;
}

/** re-render 전 선택 항목 기준 스크롤 앵커를 캡처한다. */
export function captureReactTreeScrollAnchor({
  treePaneEl,
  reactComponentListEl,
  selectedReactComponentIndex,
}: ReactTreeScrollAnchorCaptureOptions): ReactTreeScrollAnchor {
  const selectedItemSelector =
    selectedReactComponentIndex >= 0
      ? `.react-component-item[data-component-index="${selectedReactComponentIndex}"]`
      : '';
  const previousSelectedItem = selectedItemSelector
    ? reactComponentListEl.querySelector<HTMLElement>(selectedItemSelector)
    : null;
  const previousContainerTop = treePaneEl.getBoundingClientRect().top;
  const previousSelectedOffsetTop = previousSelectedItem
    ? previousSelectedItem.getBoundingClientRect().top - previousContainerTop
    : null;

  return {
    previousScrollTop: treePaneEl.scrollTop,
    previousScrollLeft: treePaneEl.scrollLeft,
    selectedItemSelector,
    previousSelectedOffsetTop,
  };
}

/** re-render 후 선택 앵커/스크롤 위치를 복원한다. */
export function restoreReactTreeScrollAnchor({
  treePaneEl,
  reactComponentListEl,
  anchor,
}: ReactTreeScrollAnchorRestoreOptions) {
  if (anchor.previousSelectedOffsetTop !== null && anchor.selectedItemSelector) {
    const nextSelectedItem = reactComponentListEl.querySelector<HTMLElement>(
      anchor.selectedItemSelector,
    );
    if (nextSelectedItem) {
      const nextContainerTop = treePaneEl.getBoundingClientRect().top;
      const nextSelectedOffsetTop = nextSelectedItem.getBoundingClientRect().top - nextContainerTop;
      treePaneEl.scrollTop += nextSelectedOffsetTop - anchor.previousSelectedOffsetTop;
    } else {
      treePaneEl.scrollTop = anchor.previousScrollTop;
    }
  } else {
    treePaneEl.scrollTop = anchor.previousScrollTop;
  }
  treePaneEl.scrollLeft = anchor.previousScrollLeft;
}
