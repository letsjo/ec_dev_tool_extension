import type { DomTreeNode } from '../../../shared/inspector/types';

/** DOM 시작 태그 라벨(`<tag ...>`)을 생성한다. */
function createDomTagLabel(node: DomTreeNode): HTMLElement {
  const line = document.createElement('span');
  line.className = 'dom-tag';

  const lt = document.createElement('span');
  lt.className = 'dom-bracket';
  lt.textContent = '<';
  line.appendChild(lt);

  const tag = document.createElement('span');
  tag.className = 'dom-tag-name';
  tag.textContent = node.tagName || 'unknown';
  line.appendChild(tag);

  node.attributes.forEach((attr) => {
    line.appendChild(document.createTextNode(' '));

    const name = document.createElement('span');
    name.className = 'dom-attr-name';
    name.textContent = attr.name;
    line.appendChild(name);

    const eqAndQuote = document.createElement('span');
    eqAndQuote.className = 'dom-bracket';
    eqAndQuote.textContent = '="';
    line.appendChild(eqAndQuote);

    const value = document.createElement('span');
    value.className = 'dom-attr-value';
    value.textContent = attr.value;
    line.appendChild(value);

    const closingQuote = document.createElement('span');
    closingQuote.className = 'dom-bracket';
    closingQuote.textContent = '"';
    line.appendChild(closingQuote);
  });

  const gt = document.createElement('span');
  gt.className = 'dom-bracket';
  gt.textContent = '>';
  line.appendChild(gt);

  if (node.textPreview) {
    const textPreview = document.createElement('span');
    textPreview.className = 'dom-text-preview';
    textPreview.textContent = `"${node.textPreview}"`;
    line.appendChild(textPreview);
  }

  return line;
}

/** DOM 닫힘 태그 라벨(`</tag>`)을 생성한다. */
function createDomClosingTagLabel(tagName: string): HTMLElement {
  const line = document.createElement('span');
  line.className = 'dom-tag';

  const lt = document.createElement('span');
  lt.className = 'dom-bracket';
  lt.textContent = '</';
  line.appendChild(lt);

  const tag = document.createElement('span');
  tag.className = 'dom-tag-name';
  tag.textContent = tagName || 'unknown';
  line.appendChild(tag);

  const gt = document.createElement('span');
  gt.className = 'dom-bracket';
  gt.textContent = '>';
  line.appendChild(gt);

  return line;
}

/** DOM 트리 노드를 `<details>` 기반 트리 UI로 렌더링한다. */
export function renderDomTreeNode(node: DomTreeNode, depth = 0): HTMLElement {
  const hasChildren = node.children.length > 0 || node.truncatedChildren > 0;
  if (!hasChildren) {
    const leaf = document.createElement('div');
    leaf.className = 'dom-leaf';
    leaf.appendChild(createDomTagLabel(node));
    return leaf;
  }

  const details = document.createElement('details');
  details.className = 'dom-node';
  if (depth < 1) details.open = true;

  const summary = document.createElement('summary');
  summary.appendChild(createDomTagLabel(node));
  details.appendChild(summary);

  const children = document.createElement('div');
  children.className = 'dom-children';
  node.children.forEach((child) => {
    children.appendChild(renderDomTreeNode(child, depth + 1));
  });

  if (node.truncatedChildren > 0) {
    const note = document.createElement('div');
    note.className = 'dom-note';
    note.textContent = `... ${node.truncatedChildren}개 자식 노드 생략됨`;
    children.appendChild(note);
  }

  const closing = document.createElement('div');
  closing.className = 'dom-closing-tag';
  closing.appendChild(createDomClosingTagLabel(node.tagName));
  details.appendChild(children);
  details.appendChild(closing);
  return details;
}
