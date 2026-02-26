import type { PickPoint } from '../../shared/inspector';

/** 필요한 값/상태를 계산해 반환 */
function getElementPath(el: Element | null) {
  const segments: string[] = [];
  let current: Element | null = el;
  let guard = 0;

  while (current && current.nodeType === 1 && guard < 40) {
    let segment = String(current.tagName || '').toLowerCase();
    if (current.id) {
      segment += `#${current.id}`;
    } else if (typeof current.className === 'string' && current.className.trim()) {
      const classes = current.className.trim().split(/\s+/).filter(Boolean).slice(0, 2);
      if (classes.length) {
        segment += `.${classes.join('.')}`;
      }
    }
    segments.unshift(segment);
    current = current.parentElement;
    guard += 1;
  }

  return segments.join(' > ');
}

/** CSS 식별자 escape를 안전하게 수행한다. */
function escapeCssIdent(value: string) {
  if (typeof CSS !== 'undefined' && CSS.escape) return CSS.escape(value);
  return String(value).replace(/[^a-zA-Z0-9_-]/g, '\\$&');
}

/** duplicate id 여부를 검사해 id selector 단독 사용 가능성을 판별한다. */
function isUniqueIdSelector(el: Element) {
  const id = el.id;
  if (!id) return false;
  const selector = `#${escapeCssIdent(id)}`;
  try {
    return (el.ownerDocument ?? document).querySelectorAll(selector).length === 1;
  } catch (_) {
    return false;
  }
}

/** 파생 데이터나 요약 값을 구성 */
function buildCssSelector(el: Element | null) {
  if (!el || el.nodeType !== 1) return '';
  if (el.id && isUniqueIdSelector(el)) return `#${escapeCssIdent(el.id)}`;

  const segments: string[] = [];
  let current: Element | null = el;
  let guard = 0;
  while (current && current.nodeType === 1 && guard < 16) {
    let segment = String(current.tagName || '').toLowerCase();
    if (!segment) break;

    const currentHasId = Boolean(current.id);
    const currentHasUniqueId = currentHasId && isUniqueIdSelector(current);
    if (currentHasId) {
      segment += `#${escapeCssIdent(current.id)}`;
    }

    const parent: Element | null = current.parentElement;
    if (parent) {
      let sameTagCount = 0;
      let nth = 0;
      for (let index = 0; index < parent.children.length; index += 1) {
        const child = parent.children[index];
        if (child.tagName === current.tagName) {
          sameTagCount += 1;
          if (child === current) nth = sameTagCount;
        }
      }
      if (sameTagCount > 1 && nth > 0) {
        segment += `:nth-of-type(${String(nth)})`;
      }
    }

    segments.unshift(segment);
    if (currentHasUniqueId) {
      break;
    }
    current = parent;
    guard += 1;
  }

  return segments.join(' > ');
}

/** 입력/참조를 실제 대상으로 해석 */
function resolveTargetElement(selector: string, pickPoint: PickPoint | null | undefined) {
  let element: Element | null = null;
  if (pickPoint && typeof pickPoint.x === 'number' && typeof pickPoint.y === 'number') {
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

export { buildCssSelector, getElementPath, resolveTargetElement };
