// @ts-nocheck
type AnyRecord = Record<string, any>;

interface CreateDomHighlightHandlersOptions {
  componentHighlightStorageKey: string;
  hoverPreviewStorageKey: string;
  buildCssSelector: (el: Element | null) => string;
  getElementPath: (el: Element | null) => string;
}

/** component highlight/hover preview 상태 복원/적용 핸들러를 구성한다. */
export function createDomHighlightHandlers(options: CreateDomHighlightHandlersOptions) {
  /** 이전 상태를 복원 */
  function restoreStyledElement(storageKey: string) {
    const previous = window[storageKey];
    if (!previous || !previous.el) return;
    try {
      previous.el.style.outline = previous.prevOutline || "";
      previous.el.style.boxShadow = previous.prevBoxShadow || "";
      previous.el.style.transition = previous.prevTransition || "";
    } catch (_) {
      /** 복원 실패는 무시한다. */
    }
  }

  /** 기존 상태를 정리 */
  function clearStoredStyle(storageKey: string) {
    try {
      restoreStyledElement(storageKey);
      window[storageKey] = null;
      return { ok: true };
    } catch (e) {
      return { ok: false, error: String(e && e.message) };
    }
  }

  /** selector 대상에 outline/shadow 스타일을 적용하고 이전 스타일 스냅샷을 저장한다. */
  function applyStyleToSelector(
    storageKey: string,
    selector: string,
    style: { outline: string; boxShadow: string },
    shouldScrollIntoView: boolean,
  ) {
    restoreStyledElement(storageKey);

    const el = selector ? document.querySelector(selector) : null;
    if (!el) {
      window[storageKey] = null;
      return { ok: false, error: "요소를 찾을 수 없습니다.", selector };
    }

    const prevOutline = el.style.outline;
    const prevBoxShadow = el.style.boxShadow;
    const prevTransition = el.style.transition;

    el.style.transition = prevTransition
      ? prevTransition + ", outline-color 120ms ease"
      : "outline-color 120ms ease";
    el.style.outline = style.outline;
    el.style.boxShadow = style.boxShadow;

    if (shouldScrollIntoView && typeof el.scrollIntoView === "function") {
      el.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
    }

    window[storageKey] = {
      el,
      prevOutline,
      prevBoxShadow,
      prevTransition,
    };

    return { ok: true, el };
  }

  /** 기존 상태를 정리 */
  function clearComponentHighlight() {
    return clearStoredStyle(options.componentHighlightStorageKey);
  }

  /** 기존 상태를 정리 */
  function clearHoverPreview() {
    return clearStoredStyle(options.hoverPreviewStorageKey);
  }

  /** 해당 기능 흐름을 처리 */
  function highlightComponent(args: AnyRecord | null | undefined) {
    const selector = typeof args?.selector === "string" ? args.selector : "";
    try {
      const applied = applyStyleToSelector(
        options.componentHighlightStorageKey,
        selector,
        {
          outline: "2px solid #ff6d00",
          boxShadow: "0 0 0 2px rgba(255,109,0,0.25)",
        },
        true,
      );
      if (!applied.ok) {
        return applied;
      }

      const el = applied.el as Element;
      const rect = el.getBoundingClientRect();
      return {
        ok: true,
        tagName: String(el.tagName || "").toLowerCase(),
        selector: options.buildCssSelector(el),
        domPath: options.getElementPath(el),
        rect: {
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
        },
      };
    } catch (e) {
      return { ok: false, error: String(e && e.message), selector };
    }
  }

  /** 해당 기능 흐름을 처리 */
  function previewComponent(args: AnyRecord | null | undefined) {
    const selector = typeof args?.selector === "string" ? args.selector : "";
    try {
      const applied = applyStyleToSelector(
        options.hoverPreviewStorageKey,
        selector,
        {
          outline: "2px solid #49a5ff",
          boxShadow: "0 0 0 2px rgba(73,165,255,0.3)",
        },
        false,
      );
      if (!applied.ok) {
        return applied;
      }
      return { ok: true };
    } catch (e) {
      return { ok: false, error: String(e && e.message), selector };
    }
  }

  return {
    clearComponentHighlight,
    clearHoverPreview,
    highlightComponent,
    previewComponent,
  };
}
