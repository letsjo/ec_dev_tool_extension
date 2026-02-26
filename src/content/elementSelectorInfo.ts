import type { ElementInfo } from "../shared/inspector";

/** DOM 경로 문자열(tag/id/class)을 부모 방향으로 조립한다. */
function getElementPath(el: Element): string {
  const segments: string[] = [];
  let current: Element | null = el;
  while (current && current.nodeType === Node.ELEMENT_NODE) {
    let seg = current.tagName.toLowerCase();
    if (current.id) seg += `#${current.id}`;
    else if (current.className && typeof current.className === "string") {
      const classes = current.className
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2);
      if (classes.length) seg += "." + classes.join(".");
    }
    segments.unshift(seg);
    current = current.parentElement;
  }
  return segments.join(" > ");
}

/** CSS selector id/token에 필요한 escape를 수행한다. */
function escapeCssIdent(value: string): string {
  if (typeof CSS !== "undefined" && typeof CSS.escape === "function") return CSS.escape(value);
  return value.replace(/[^a-zA-Z0-9_-]/g, "\\$&");
}

/** duplicate id 환경에서 id selector를 단독으로 사용해도 되는지 판별한다. */
function isUniqueIdSelector(el: Element): boolean {
  const id = (el as HTMLElement).id;
  if (!id) return false;
  const selector = `#${escapeCssIdent(id)}`;
  try {
    return (el.ownerDocument ?? document).querySelectorAll(selector).length === 1;
  } catch (_) {
    return false;
  }
}

/** element 기준으로 비교적 안정적인 css selector를 생성한다. */
function buildCssSelector(el: Element): string {
  if ((el as HTMLElement).id && isUniqueIdSelector(el)) {
    return `#${escapeCssIdent((el as HTMLElement).id)}`;
  }

  const segments: string[] = [];
  let current: Element | null = el;
  let guard = 0;
  while (current && current.nodeType === Node.ELEMENT_NODE && guard < 16) {
    const tag = current.tagName.toLowerCase();
    let segment = tag;

    const id = (current as HTMLElement).id;
    const hasUniqueId = Boolean(id) && isUniqueIdSelector(current);
    if (id) {
      segment += `#${escapeCssIdent(id)}`;
    }

    const parentEl: Element | null = current.parentElement;
    if (parentEl) {
      let sameTagCount = 0;
      let nth = 0;
      for (let i = 0; i < parentEl.children.length; i += 1) {
        const child = parentEl.children.item(i);
        if (!child) continue;
        if (child.tagName === current.tagName) {
          sameTagCount += 1;
          if (child === current) nth = sameTagCount;
        }
      }
      if (sameTagCount > 1 && nth > 0) {
        segment += `:nth-of-type(${nth})`;
      }
    }

    segments.unshift(segment);
    if (hasUniqueId) {
      break;
    }
    current = parentEl;
    guard += 1;
  }

  return segments.join(" > ");
}

/** selector가 비어 있으면 tagName fallback을 반환한다. */
function getSimpleSelector(el: Element): string {
  const selector = buildCssSelector(el);
  return selector || el.tagName.toLowerCase();
}

/** 선택 지점의 element 정보를 패널 전송용 payload로 구성한다. */
export function getElementInfo(
  el: Element,
  clickX: number,
  clickY: number,
): ElementInfo {
  const rect = el.getBoundingClientRect();
  return {
    tagName: el.tagName.toLowerCase(),
    id: (el as HTMLElement).id || null,
    className: (el as HTMLElement).className || null,
    domPath: getElementPath(el),
    selector: getSimpleSelector(el),
    rect: {
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
    },
    innerText: (el as HTMLElement).innerText?.slice(0, 200) ?? null,
    clickPoint: { x: clickX, y: clickY },
  };
}
