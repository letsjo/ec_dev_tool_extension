type StyleableElement = Element & {
  style: CSSStyleDeclaration;
  scrollIntoView?: (options?: ScrollIntoViewOptions) => void;
};

function isStyleableElement(element: Element): element is StyleableElement {
  return 'style' in element;
}

interface StoredElementStyleSnapshot {
  el: StyleableElement;
  prevOutline: string;
  prevBoxShadow: string;
  prevTransition: string;
}

interface ApplyStyleToSelectorOptions {
  storageKey: string;
  selector: string;
  targetElement?: Element | null;
  outline: string;
  boxShadow: string;
  shouldScrollIntoView: boolean;
}

interface StyleApplySuccess {
  ok: true;
  el: StyleableElement;
}

interface StyleApplyFailure {
  ok: false;
  error: string;
  selector: string;
}

type StyleApplyResult = StyleApplySuccess | StyleApplyFailure;

function getWindowStore(): Record<string, unknown> {
  return window as unknown as Record<string, unknown>;
}

function readStoredStyleSnapshot(storageKey: string): StoredElementStyleSnapshot | null {
  const value = getWindowStore()[storageKey];
  if (!value || typeof value !== 'object') return null;

  const record = value as Record<string, unknown>;
  if (!(record.el instanceof Element) || !isStyleableElement(record.el)) return null;
  return {
    el: record.el,
    prevOutline: typeof record.prevOutline === 'string' ? record.prevOutline : '',
    prevBoxShadow: typeof record.prevBoxShadow === 'string' ? record.prevBoxShadow : '',
    prevTransition: typeof record.prevTransition === 'string' ? record.prevTransition : '',
  };
}

function writeStoredStyleSnapshot(
  storageKey: string,
  snapshot: StoredElementStyleSnapshot | null,
): void {
  getWindowStore()[storageKey] = snapshot;
}

/** 이전 상태를 복원 */
function restoreStoredStyleSnapshot(storageKey: string): void {
  const previous = readStoredStyleSnapshot(storageKey);
  if (!previous) return;

  try {
    previous.el.style.outline = previous.prevOutline || '';
    previous.el.style.boxShadow = previous.prevBoxShadow || '';
    previous.el.style.transition = previous.prevTransition || '';
  } catch (_) {
    /** 복원 실패는 무시한다. */
  }
}

/** 기존 상태를 정리 */
function clearStoredStyleSnapshot(storageKey: string): { ok: true } | { ok: false; error: string } {
  try {
    restoreStoredStyleSnapshot(storageKey);
    writeStoredStyleSnapshot(storageKey, null);
    return { ok: true };
  } catch (error: unknown) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/** selector 대상에 outline/shadow 스타일을 적용하고 이전 스타일 스냅샷을 저장한다. */
function applyStyleToSelector(options: ApplyStyleToSelectorOptions): StyleApplyResult {
  restoreStoredStyleSnapshot(options.storageKey);

  const resolvedElement =
    options.targetElement ??
    (options.selector ? document.querySelector(options.selector) : null);
  if (!resolvedElement || !isStyleableElement(resolvedElement)) {
    writeStoredStyleSnapshot(options.storageKey, null);
    return {
      ok: false,
      error: '요소를 찾을 수 없습니다.',
      selector: options.selector,
    };
  }
  const element = resolvedElement;

  const prevOutline = element.style.outline;
  const prevBoxShadow = element.style.boxShadow;
  const prevTransition = element.style.transition;

  element.style.transition = prevTransition
    ? `${prevTransition}, outline-color 120ms ease`
    : 'outline-color 120ms ease';
  element.style.outline = options.outline;
  element.style.boxShadow = options.boxShadow;

  if (options.shouldScrollIntoView && typeof element.scrollIntoView === 'function') {
    element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
  }

  writeStoredStyleSnapshot(options.storageKey, {
    el: element,
    prevOutline,
    prevBoxShadow,
    prevTransition,
  });
  return { ok: true, el: element };
}

export {
  applyStyleToSelector,
  clearStoredStyleSnapshot,
};
export type {
  ApplyStyleToSelectorOptions,
  StyleApplyFailure,
  StyleApplyResult,
  StyleApplySuccess,
  StoredElementStyleSnapshot,
};
