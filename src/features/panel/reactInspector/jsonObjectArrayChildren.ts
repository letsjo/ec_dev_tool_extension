import {
  resolveDisplayChildPathSegment as resolveDisplayChildPathSegmentValue,
} from './collectionDisplay';
import type { JsonRenderContext } from './jsonRenderTypes';
import { createExpandableValueRow, createRowToggleSpacer } from './jsonRowUi';
import { isJsonInternalMetaKey } from './preview/jsonPreview';

interface CreateObjectArrayChildrenNodeArgs {
  sourceValue: unknown;
  depth: number;
  context: JsonRenderContext;
  createJsonValueNode: (
    value: unknown,
    depth: number,
    context: JsonRenderContext,
  ) => HTMLElement;
}

/** object/array details children 블록을 구성한다. */
export function createObjectArrayChildrenNode({
  sourceValue,
  depth,
  context,
  createJsonValueNode,
}: CreateObjectArrayChildrenNodeArgs): HTMLDivElement {
  const children = document.createElement('div');
  children.className = 'json-children';

  if (sourceValue === null || typeof sourceValue !== 'object') {
    const row = document.createElement('div');
    row.className = 'json-row';
    row.appendChild(
      createJsonValueNode(sourceValue, depth + 1, {
        ...context,
        allowInspect: false,
      }),
    );
    children.appendChild(row);
    return children;
  }

  const entries = Array.isArray(sourceValue)
    ? sourceValue.map((item, index) => [index, item] as const)
    : Object.entries(sourceValue as Record<string, unknown>).filter(
        ([key]) => !isJsonInternalMetaKey(key),
      );

  if (entries.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'json-row';
    empty.textContent = '(empty)';
    children.appendChild(empty);
    return children;
  }

  entries.forEach(([key, childValue]) => {
    /** Map/Set 표시 변환이 있어도 실제 inspect path는 원본 경로를 사용한다. */
    const childPathSegment = resolveDisplayChildPathSegmentValue(sourceValue, key);
    const childNode = createJsonValueNode(childValue, depth + 1, {
      ...context,
      path: [...context.path, childPathSegment],
    });

    if (childNode instanceof HTMLDetailsElement) {
      const keyEl = document.createElement('span');
      keyEl.className = 'json-key';
      keyEl.textContent = String(key);
      children.appendChild(
        createExpandableValueRow({
          keyEl,
          valueDetails: childNode,
        }),
      );
      return;
    }

    const row = document.createElement('div');
    row.className = 'json-row json-row-with-spacer';
    row.appendChild(createRowToggleSpacer());

    const keyEl = document.createElement('span');
    keyEl.className = 'json-key';
    keyEl.textContent = String(key);
    row.appendChild(keyEl);
    row.appendChild(document.createTextNode(': '));
    row.appendChild(childNode);
    children.appendChild(row);
  });

  return children;
}
