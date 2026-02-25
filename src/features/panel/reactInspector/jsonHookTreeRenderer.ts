import type { JsonPathSegment } from '../../../shared/inspector/types';
import type { HookRowItem, HookTreeNode } from './hookTreeModel';
import type { JsonRenderContext } from './jsonRenderTypes';
import {
  createDetailsToggleButton,
  createExpandableValueRow,
  createRowToggleSpacer,
} from './jsonRowUi';

interface AppendHookTreeOptions {
  container: HTMLElement;
  nodes: HookTreeNode[];
  context: JsonRenderContext;
  createJsonValueNode: (
    value: unknown,
    depth: number,
    context: JsonRenderContext,
  ) => HTMLElement;
}

/** hook state 값을 row 렌더용 node로 생성한다. */
function createHookRowValueNode(
  value: unknown,
  context: JsonRenderContext,
  path: JsonPathSegment[],
  createJsonValueNode: (
    value: unknown,
    depth: number,
    context: JsonRenderContext,
  ) => HTMLElement,
): HTMLElement {
  const node = createJsonValueNode(value, 1, {
    ...context,
    path,
  });

  if (node instanceof HTMLDetailsElement) {
    node.classList.add('json-hook-state-node');
  }

  return node;
}

/** hook item row를 컨테이너에 렌더한다. */
function appendHookRow(
  container: HTMLElement,
  item: HookRowItem,
  context: JsonRenderContext,
  createJsonValueNode: (
    value: unknown,
    depth: number,
    context: JsonRenderContext,
  ) => HTMLElement,
) {
  const keyEl = document.createElement('span');
  keyEl.className = 'json-key json-hook-key';

  const indexEl = document.createElement('span');
  indexEl.className = 'json-hook-index';
  indexEl.textContent = String(item.order);
  keyEl.appendChild(indexEl);

  const nameEl = document.createElement('span');
  nameEl.className = 'json-hook-name';
  nameEl.textContent = item.name;
  keyEl.appendChild(nameEl);

  if (item.badge) {
    const badgeEl = document.createElement('span');
    badgeEl.className = `json-hook-badge json-hook-badge-${item.badge}`;
    badgeEl.textContent = item.badge === 'effect' ? 'effect' : 'fn';
    keyEl.appendChild(badgeEl);
  }

  const valueNode = createHookRowValueNode(
    item.state,
    context,
    [item.sourceIndex, 'state'],
    createJsonValueNode,
  );

  if (valueNode instanceof HTMLDetailsElement) {
    container.appendChild(
      createExpandableValueRow({
        keyEl,
        valueDetails: valueNode,
        extraClassName: 'json-hook-row',
      }),
    );
    return;
  }

  const row = document.createElement('div');
  row.className = 'json-row json-row-with-spacer json-hook-row';
  row.appendChild(createRowToggleSpacer());
  row.appendChild(keyEl);
  row.appendChild(document.createTextNode(': '));
  row.appendChild(valueNode);
  container.appendChild(row);
}

/** hook tree(group/item)를 JSON details 노드로 재귀 렌더한다. */
export function appendHookTreeNodes(options: AppendHookTreeOptions) {
  options.nodes.forEach((node) => {
    if (node.type === 'item') {
      appendHookRow(options.container, node.item, options.context, options.createJsonValueNode);
      return;
    }

    const groupDetails = document.createElement('details');
    groupDetails.className = 'json-node json-hook-group';
    groupDetails.open = false;

    const groupTitle = document.createElement('summary');
    groupTitle.className = 'json-hook-group-title';
    groupTitle.appendChild(createDetailsToggleButton(groupDetails));
    const groupLabel = document.createElement('span');
    groupLabel.textContent = node.title;
    groupTitle.appendChild(groupLabel);
    groupDetails.appendChild(groupTitle);

    const groupChildren = document.createElement('div');
    groupChildren.className = 'json-children json-hook-group-children';
    appendHookTreeNodes({
      ...options,
      container: groupChildren,
      nodes: node.children,
    });
    groupDetails.appendChild(groupChildren);
    options.container.appendChild(groupDetails);
  });
}
