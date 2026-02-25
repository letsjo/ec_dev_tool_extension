// @ts-nocheck
type AnyRecord = Record<string, any>;
type PickPoint = { x: number; y: number };

interface CreateGetDomTreeHandlerOptions {
  buildCssSelector: (el: Element | null) => string;
  getElementPath: (el: Element | null) => string;
  resolveTargetElement: (
    selector: string,
    pickPoint: PickPoint | null | undefined,
  ) => Element | null;
}

/** element text child를 요약해 DOM tree 미리보기 텍스트를 만든다. */
function getTextPreview(el: Element) {
  const nodes = el.childNodes || [];
  const parts = [];
  let scanned = 0;
  for (let i = 0; i < nodes.length && scanned < 24; i += 1) {
    const node = nodes[i];
    if (!node) continue;
    if (node.nodeType === Node.TEXT_NODE) {
      const text = String(node.textContent || "").replace(/\s+/g, " ").trim();
      if (text) parts.push(text);
      scanned += 1;
    }
  }
  const merged = parts.join(" ");
  return merged.length > 140 ? merged.slice(0, 140) + "…" : merged;
}

/** DOM tree 직렬화 핸들러를 구성한다. */
export function createGetDomTreeHandler(options: CreateGetDomTreeHandlerOptions) {
  /** 필요한 값/상태를 계산해 반환 */
  return function getDomTree(args: AnyRecord | null | undefined) {
    const selector = typeof args?.selector === "string" ? args.selector : "";
    const pickPoint = args?.pickPoint;
    const MAX_DEPTH = 4;
    const MAX_CHILDREN_PER_NODE = 32;
    const MAX_TOTAL_NODES = 700;
    const MAX_ATTRS = 16;

    let visitedNodes = 0;
    let truncatedByBudget = false;

    function truncateText(text: unknown, max: number) {
      const str = String(text == null ? "" : text);
      return str.length > max ? str.slice(0, max) + "…" : str;
    }

    function serializeNode(el: Element | null, depth: number) {
      if (!el || el.nodeType !== 1) return null;
      visitedNodes += 1;
      if (visitedNodes > MAX_TOTAL_NODES) {
        truncatedByBudget = true;
        return null;
      }

      const attrs = [];
      if (el.attributes) {
        const attrCount = Math.min(el.attributes.length, MAX_ATTRS);
        for (let i = 0; i < attrCount; i += 1) {
          const attr = el.attributes[i];
          attrs.push({
            name: String(attr.name || ""),
            value: truncateText(attr.value, 120),
          });
        }
      }

      const children = [];
      let truncatedChildren = 0;
      const childElements = el.children || [];

      if (depth < MAX_DEPTH) {
        const len = childElements.length;
        const maxChildren = Math.min(len, MAX_CHILDREN_PER_NODE);
        for (let i = 0; i < maxChildren; i += 1) {
          const childNode = serializeNode(childElements[i], depth + 1);
          if (childNode) {
            children.push(childNode);
          } else {
            truncatedChildren += 1;
          }
        }
        if (len > maxChildren) {
          truncatedChildren += len - maxChildren;
        }
      } else {
        truncatedChildren = childElements.length;
      }

      return {
        tagName: String(el.tagName || "").toLowerCase(),
        id: el.id ? String(el.id) : null,
        className: el.className ? truncateText(String(el.className), 120) : null,
        attributes: attrs,
        childCount: childElements.length,
        truncatedChildren,
        textPreview: getTextPreview(el) || null,
        children,
      };
    }

    try {
      const found = options.resolveTargetElement(selector, pickPoint);
      if (!found || found.nodeType !== 1) {
        return {
          ok: false,
          error: "요소를 찾을 수 없습니다.",
          selector,
        };
      }

      const root = serializeNode(found, 0);
      if (!root) {
        return {
          ok: false,
          error: "DOM 트리를 구성하지 못했습니다.",
          selector,
        };
      }

      return {
        ok: true,
        selector: options.buildCssSelector(found) || selector || null,
        domPath: options.getElementPath(found),
        root,
        meta: {
          truncatedByBudget,
        },
      };
    } catch (e) {
      return {
        ok: false,
        error: String(e && e.message),
        selector,
      };
    }
  };
}
