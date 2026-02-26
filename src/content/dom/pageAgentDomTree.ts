import { isPickPoint, isRecord } from '../../shared/inspector/guards';
import type { DomTreeAttribute, DomTreeNode, PickPoint } from '../../shared/inspector/types';

interface CreateGetDomTreeHandlerOptions {
  buildCssSelector: (el: Element | null) => string;
  getElementPath: (el: Element | null) => string;
  resolveTargetElement: (
    selector: string,
    pickPoint: PickPoint | null | undefined,
  ) => Element | null;
}

interface DomTreeRequestArgs {
  selector: string;
  pickPoint: PickPoint | null;
}

interface DomTreeSuccessResult {
  ok: true;
  selector: string | null;
  domPath: string;
  root: DomTreeNode;
  meta: {
    truncatedByBudget: boolean;
  };
}

interface DomTreeErrorResult {
  ok: false;
  error: string;
  selector: string;
}

type GetDomTreeResult = DomTreeSuccessResult | DomTreeErrorResult;

const MAX_DEPTH = 4;
const MAX_CHILDREN_PER_NODE = 32;
const MAX_TOTAL_NODES = 700;
const MAX_ATTRS = 16;

/** element text child를 요약해 DOM tree 미리보기 텍스트를 만든다. */
function getTextPreview(el: Element): string {
  const nodes = el.childNodes;
  const parts: string[] = [];
  let scanned = 0;
  for (let index = 0; index < nodes.length && scanned < 24; index += 1) {
    const node = nodes[index];
    if (!node) continue;
    if (node.nodeType === Node.TEXT_NODE) {
      const text = String(node.textContent || '').replace(/\s+/g, ' ').trim();
      if (text) parts.push(text);
      scanned += 1;
    }
  }
  const merged = parts.join(' ');
  return merged.length > 140 ? `${merged.slice(0, 140)}…` : merged;
}

function readDomTreeRequestArgs(args: unknown): DomTreeRequestArgs {
  if (!isRecord(args)) {
    return {
      selector: '',
      pickPoint: null,
    };
  }

  return {
    selector: typeof args.selector === 'string' ? args.selector : '',
    pickPoint: isPickPoint(args.pickPoint) ? args.pickPoint : null,
  };
}

function truncateText(text: unknown, maxLength: number): string {
  const raw = String(text == null ? '' : text);
  return raw.length > maxLength ? `${raw.slice(0, maxLength)}…` : raw;
}

interface DomTreeSerializeContext {
  visitedNodes: number;
  truncatedByBudget: boolean;
}

function serializeDomNode(
  element: Element | null,
  depth: number,
  context: DomTreeSerializeContext,
): DomTreeNode | null {
  if (!element || element.nodeType !== 1) return null;

  context.visitedNodes += 1;
  if (context.visitedNodes > MAX_TOTAL_NODES) {
    context.truncatedByBudget = true;
    return null;
  }

  const attributes: DomTreeAttribute[] = [];
  const attributeCount = Math.min(element.attributes.length, MAX_ATTRS);
  for (let index = 0; index < attributeCount; index += 1) {
    const attribute = element.attributes[index];
    attributes.push({
      name: String(attribute.name || ''),
      value: truncateText(attribute.value, 120),
    });
  }

  const children: DomTreeNode[] = [];
  let truncatedChildren = 0;
  const childElements = element.children;
  if (depth < MAX_DEPTH) {
    const maxChildren = Math.min(childElements.length, MAX_CHILDREN_PER_NODE);
    for (let index = 0; index < maxChildren; index += 1) {
      const childNode = serializeDomNode(childElements[index], depth + 1, context);
      if (childNode) {
        children.push(childNode);
      } else {
        truncatedChildren += 1;
      }
    }
    if (childElements.length > maxChildren) {
      truncatedChildren += childElements.length - maxChildren;
    }
  } else {
    truncatedChildren = childElements.length;
  }

  return {
    tagName: String(element.tagName || '').toLowerCase(),
    id: element.id ? String(element.id) : null,
    className: element.className ? truncateText(String(element.className), 120) : null,
    attributes,
    childCount: childElements.length,
    truncatedChildren,
    textPreview: getTextPreview(element) || null,
    children,
  };
}

/** DOM tree 직렬화 핸들러를 구성한다. */
export function createGetDomTreeHandler(options: CreateGetDomTreeHandlerOptions) {
  /** selector/pickPoint 기준 DOM tree를 직렬화하고 예외/budget 정보를 함께 반환한다. */
  return function getDomTree(args: unknown): GetDomTreeResult {
    const { selector, pickPoint } = readDomTreeRequestArgs(args);
    const context: DomTreeSerializeContext = {
      visitedNodes: 0,
      truncatedByBudget: false,
    };

    try {
      const found = options.resolveTargetElement(selector, pickPoint);
      if (!found || found.nodeType !== 1) {
        return {
          ok: false,
          error: '요소를 찾을 수 없습니다.',
          selector,
        };
      }

      const root = serializeDomNode(found, 0, context);
      if (!root) {
        return {
          ok: false,
          error: 'DOM 트리를 구성하지 못했습니다.',
          selector,
        };
      }

      return {
        ok: true,
        selector: options.buildCssSelector(found) || selector || null,
        domPath: options.getElementPath(found),
        root,
        meta: {
          truncatedByBudget: context.truncatedByBudget,
        },
      };
    } catch (error: unknown) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
        selector,
      };
    }
  };
}
