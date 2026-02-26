import type { ReactComponentInfo } from '../../../shared/inspector';

const MAX_ATTRIBUTE_ENTRIES = 24;
const MAX_TEXT_PREVIEW_LENGTH = 160;
const MAX_CHAIN_DEPTH = 14;

interface DomComponentFactoryOptions {
  buildCssSelector: (el: Element | null) => string;
  getElementPath: (el: Element | null) => string;
}

function readElementTextPreview(element: Element) {
  const text = element.textContent?.replace(/\s+/g, ' ').trim() ?? '';
  if (!text) return null;
  if (text.length <= MAX_TEXT_PREVIEW_LENGTH) {
    return text;
  }
  return `${text.slice(0, MAX_TEXT_PREVIEW_LENGTH)}…`;
}

function buildDomComponentName(element: Element) {
  const tagName = String(element.tagName || '').toLowerCase();
  const idPart = element.id ? `#${element.id}` : '';
  const classPart =
    typeof element.className === 'string' && element.className.trim().length > 0
      ? `.${element.className.trim().split(/\s+/).slice(0, 2).join('.')}`
      : '';
  return `<${tagName}${idPart}${classPart}>`;
}

function buildDomComponentId(domPath: string, depth: number) {
  const compactPath = domPath.replace(/\s+/g, ' ').trim();
  if (!compactPath) {
    return `dom:depth-${depth}`;
  }
  return `dom:${compactPath}`;
}

function buildDomComponentProps(
  element: Element,
  selector: string,
  domPath: string,
) {
  const attrs = Array.from(element.attributes).slice(0, MAX_ATTRIBUTE_ENTRIES);
  const rect = element.getBoundingClientRect();
  return {
    nodeType: 'Element',
    selector,
    domPath,
    tagName: String(element.tagName || '').toLowerCase(),
    id: element.id || null,
    className: typeof element.className === 'string' ? element.className || null : null,
    childElementCount: element.childElementCount,
    textPreview: readElementTextPreview(element),
    attributes: attrs.map((attr) => ({ name: attr.name, value: attr.value })),
    rect: {
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
    },
  };
}

function toDomComponentInfo(
  element: Element,
  depth: number,
  parentId: string | null,
  options: DomComponentFactoryOptions,
): ReactComponentInfo {
  const domSelector = options.buildCssSelector(element) || null;
  const domPath = options.getElementPath(element) || null;
  const selectorText = domSelector ?? '';
  const pathText = domPath ?? '';

  return {
    id: buildDomComponentId(pathText, depth),
    parentId,
    name: buildDomComponentName(element),
    kind: 'DomElement',
    depth,
    props: buildDomComponentProps(element, selectorText, pathText),
    hooks: [],
    hookCount: 0,
    hasSerializedData: true,
    domSelector,
    domPath,
    domTagName: String(element.tagName || '').toLowerCase(),
  };
}

/**
 * non-React target element를 트리/인스펙터에 표시하기 위한 fallback component를 만든다.
 * - `buildTargetChain`: 루트 -> target DOM chain 구성(React fiber 미탐색 시 사용)
 * - `buildTargetLeaf`: 기존 React 목록에 target leaf 1개를 붙일 때 사용
 */
export function createInspectComponentsDomFallbackFactory(
  options: DomComponentFactoryOptions,
) {
  function buildTargetChain(targetElement: Element): ReactComponentInfo[] {
    const chain: Element[] = [];
    let cursor: Element | null = targetElement;
    while (cursor && chain.length < MAX_CHAIN_DEPTH) {
      chain.push(cursor);
      cursor = cursor.parentElement;
    }
    chain.reverse();

    const components: ReactComponentInfo[] = [];
    let parentId: string | null = null;
    chain.forEach((element, index) => {
      const info = toDomComponentInfo(element, index, parentId, options);
      parentId = info.id;
      components.push(info);
    });
    return components;
  }

  function buildTargetLeaf(
    targetElement: Element,
    depth: number,
    parentId: string | null,
  ): ReactComponentInfo {
    return toDomComponentInfo(targetElement, depth, parentId, options);
  }

  return {
    buildTargetChain,
    buildTargetLeaf,
  };
}
