// @ts-nocheck
import { createGetDomTreeHandler as createGetDomTreeHandlerValue } from "./pageAgentDomTree";
import { createDomHighlightHandlers as createDomHighlightHandlersValue } from "./pageAgentDomHighlight";

type PickPoint = { x: number; y: number };

interface CreatePageDomHandlersOptions {
  componentHighlightStorageKey: string;
  hoverPreviewStorageKey: string;
}

/** 필요한 값/상태를 계산해 반환 */
export function getElementPath(el: Element | null) {
  const segments = [];
  let current = el;
  let guard = 0;
  while (current && current.nodeType === 1 && guard < 40) {
    let seg = String(current.tagName || "").toLowerCase();
    if (current.id) {
      seg += "#" + current.id;
    } else if (typeof current.className === "string" && current.className.trim()) {
      const classes = current.className.trim().split(/\s+/).filter(Boolean).slice(0, 2);
      if (classes.length) seg += "." + classes.join(".");
    }
    segments.unshift(seg);
    current = current.parentElement;
    guard += 1;
  }
  return segments.join(" > ");
}

/** CSS 식별자 escape를 안전하게 수행한다. */
function escapeCssIdent(value: string) {
  if (typeof CSS !== "undefined" && CSS.escape) return CSS.escape(value);
  return String(value).replace(/[^a-zA-Z0-9_-]/g, "\\$&");
}

/** 파생 데이터나 요약 값을 구성 */
export function buildCssSelector(el: Element | null) {
  if (!el || el.nodeType !== 1) return "";
  if (el.id) return "#" + escapeCssIdent(el.id);

  const segments = [];
  let current = el;
  let guard = 0;
  while (current && current.nodeType === 1 && guard < 16) {
    let segment = String(current.tagName || "").toLowerCase();
    if (!segment) break;

    if (current.id) {
      segment += "#" + escapeCssIdent(current.id);
      segments.unshift(segment);
      break;
    }

    const parent = current.parentElement;
    if (parent) {
      let sameTagCount = 0;
      let nth = 0;
      for (let i = 0; i < parent.children.length; i += 1) {
        const child = parent.children[i];
        if (child.tagName === current.tagName) {
          sameTagCount += 1;
          if (child === current) nth = sameTagCount;
        }
      }
      if (sameTagCount > 1 && nth > 0) {
        segment += ":nth-of-type(" + String(nth) + ")";
      }
    }

    segments.unshift(segment);
    current = parent;
    guard += 1;
  }

  return segments.join(" > ");
}

/** 입력/참조를 실제 대상으로 해석 */
export function resolveTargetElement(selector: string, pickPoint: PickPoint | null | undefined) {
  let element: Element | null = null;
  if (pickPoint && typeof pickPoint.x === "number" && typeof pickPoint.y === "number") {
    element = document.elementFromPoint(pickPoint.x, pickPoint.y);
  }
  if (!element && selector) {
    try {
      element = document.querySelector(selector);
    } catch (_) {
      element = null;
    }
  }
  return element;
}

/** pageAgent의 DOM 관련 메서드 핸들러를 구성한다. */
export function createPageDomHandlers(options: CreatePageDomHandlersOptions) {
  const getDomTree = createGetDomTreeHandlerValue({
    buildCssSelector,
    getElementPath,
    resolveTargetElement,
  });

  const {
    clearComponentHighlight,
    clearHoverPreview,
    highlightComponent,
    previewComponent,
  } = createDomHighlightHandlersValue({
    componentHighlightStorageKey: options.componentHighlightStorageKey,
    hoverPreviewStorageKey: options.hoverPreviewStorageKey,
    buildCssSelector,
    getElementPath,
  });

  return {
    getDomTree,
    clearComponentHighlight,
    clearHoverPreview,
    highlightComponent,
    previewComponent,
  };
}
