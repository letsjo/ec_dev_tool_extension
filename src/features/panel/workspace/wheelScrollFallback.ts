/** 해당 기능 흐름을 처리 */
function isScrollableAxisOverflow(value: string): boolean {
  return value === 'auto' || value === 'scroll' || value === 'overlay';
}

/** 조건 여부를 판별 */
function isKnownWheelScrollableContainer(el: HTMLElement): boolean {
  return (
    el.id === 'treePane' ||
    el.id === 'detailPane' ||
    el.id === 'selectedElementPane' ||
    el.id === 'selectedElementPathPane' ||
    el.id === 'selectedElementDomPane' ||
    el.id === 'output'
  );
}

/** 주어진 델타 방향으로 엘리먼트를 실제 스크롤할 수 있는지 판별 */
function canScrollElement(el: HTMLElement, deltaX: number, deltaY: number): boolean {
  const style = getComputedStyle(el);
  const allowY = isScrollableAxisOverflow(style.overflowY) || isKnownWheelScrollableContainer(el);
  const allowX = isScrollableAxisOverflow(style.overflowX) || isKnownWheelScrollableContainer(el);

  if (deltaY !== 0) {
    if (el.scrollHeight > el.clientHeight + 1 && allowY) {
      if (deltaY < 0 && el.scrollTop > 0) return true;
      if (deltaY > 0 && el.scrollTop + el.clientHeight < el.scrollHeight - 1) return true;
    }
  }
  if (deltaX !== 0) {
    if (el.scrollWidth > el.clientWidth + 1 && allowX) {
      if (deltaX < 0 && el.scrollLeft > 0) return true;
      if (deltaX > 0 && el.scrollLeft + el.clientWidth < el.scrollWidth - 1) return true;
    }
  }
  return false;
}

/** 조건에 맞는 대상을 탐색 */
function findScrollableElement(
  start: EventTarget | null,
  scope: HTMLElement,
  deltaX: number,
  deltaY: number,
): HTMLElement | null {
  let current = start instanceof HTMLElement ? start : null;
  while (current && current !== scope.parentElement) {
    if (canScrollElement(current, deltaX, deltaY)) {
      return current;
    }
    if (current === scope) break;
    current = current.parentElement;
  }
  return null;
}

/**
 * 패널 내부 스크롤이 브라우저/DevTools 기본 버블링 때문에 끊기는 케이스를 보완한다.
 * capture 단계에서 "실제로 스크롤 가능한 가장 가까운 컨테이너"를 찾아
 * 수동 스크롤 후 이벤트를 consume한다.
 */
export function initWheelScrollFallback(panelWorkspaceEl: HTMLElement): () => void {
  const onWheel = (event: WheelEvent) => {
    if (event.defaultPrevented || event.ctrlKey || event.metaKey) return;
    const eventTarget = event.target instanceof HTMLElement ? event.target : null;
    if (eventTarget && eventTarget.closest('input, textarea, select')) return;
    const deltaX = event.deltaX;
    const deltaY = event.deltaY;
    if (deltaX === 0 && deltaY === 0) return;

    const scrollable = findScrollableElement(event.target, panelWorkspaceEl, deltaX, deltaY);
    if (!scrollable) return;

    const prevTop = scrollable.scrollTop;
    const prevLeft = scrollable.scrollLeft;
    if (deltaY !== 0) {
      scrollable.scrollTop += deltaY;
    }
    if (deltaX !== 0) {
      scrollable.scrollLeft += deltaX;
    }

    if (scrollable.scrollTop !== prevTop || scrollable.scrollLeft !== prevLeft) {
      event.preventDefault();
      event.stopPropagation();
    }
  };

  panelWorkspaceEl.addEventListener('wheel', onWheel, { capture: true, passive: false });
  return () => {
    panelWorkspaceEl.removeEventListener('wheel', onWheel, { capture: true });
  };
}
