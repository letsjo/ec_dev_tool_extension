import {
  normalizeCollectionTokenForDisplay as normalizeCollectionTokenForDisplayValue,
  readDisplayCollectionMeta as readDisplayCollectionMetaValue,
  resolveDisplayChildPathSegment as resolveDisplayChildPathSegmentValue,
} from './collectionDisplay';
import type {
  FetchSerializedValueAtPathHandler,
  JsonRenderContext as JsonObjectArrayRenderContext,
} from './jsonRenderTypes';
import {
  createExpandableValueRow,
  createRowToggleSpacer,
} from './jsonRowUi';
import {
  buildHookInlinePreview,
  buildJsonSummaryPreview,
  getObjectDisplayName,
  isJsonInternalMetaKey,
} from './jsonPreview';

interface CreateObjectArrayJsonValueNodeArgs {
  value: Record<string, unknown> | unknown[];
  depth: number;
  context: JsonObjectArrayRenderContext;
  createJsonValueNode: (
    value: unknown,
    depth: number,
    context: JsonObjectArrayRenderContext,
  ) => HTMLElement;
  fetchSerializedValueAtPath: FetchSerializedValueAtPathHandler;
}

/** object/array 계열 value를 details(summary + lazy children) 노드로 렌더링한다. */
function createObjectArrayJsonValueNode({
  value,
  depth,
  context,
  createJsonValueNode,
  fetchSerializedValueAtPath,
}: CreateObjectArrayJsonValueNodeArgs): HTMLElement {
  const details = document.createElement('details');
  details.className = 'json-node';

  const summary = document.createElement('summary');
  let currentValue: unknown = value;
  /** 펼칠 때 실제 런타임 값을 재조회해 stale 데이터를 줄인다. */
  const shouldRuntimeRefreshOnExpand =
    context.allowInspect &&
    context.path.length > 0 &&
    (context.section === 'props' || context.section === 'hooks');
  let runtimeRefreshAttempted = false;
  let runtimeRefreshInFlight = false;

  const setSummaryContent = (
    metaText: string | null,
    previewText: string,
    previewClassName?: string,
  ) => {
    while (summary.firstChild) {
      summary.removeChild(summary.firstChild);
    }

    if (metaText) {
      const meta = document.createElement('span');
      meta.className = 'json-summary-meta';
      meta.textContent = metaText;
      summary.appendChild(meta);
      if (previewText) {
        summary.appendChild(document.createTextNode(' '));
      }
    }

    const preview = document.createElement('span');
    preview.className = previewClassName ?? 'json-summary-preview';
    preview.textContent = previewText;
    summary.appendChild(preview);
  };

  const applySummaryText = () => {
    if (context.section === 'hooks') {
      const preview = buildHookInlinePreview(currentValue);
      setSummaryContent(null, preview);
      return;
    }
    if (Array.isArray(currentValue)) {
      const collectionMeta = readDisplayCollectionMetaValue(currentValue);
      const preview = buildJsonSummaryPreview(currentValue);
      if (collectionMeta?.type === 'map') {
        setSummaryContent(`Map(${collectionMeta.size})`, preview);
        return;
      }
      if (collectionMeta?.type === 'set') {
        setSummaryContent(`Set(${collectionMeta.size})`, preview);
        return;
      }
      setSummaryContent(`Array(${currentValue.length})`, preview);
      return;
    }
    const visibleKeyCount =
      currentValue && typeof currentValue === 'object'
        ? Object.keys(currentValue as Record<string, unknown>).filter(
            (key) => !isJsonInternalMetaKey(key),
          )
            .length
        : 0;
    const objectName = getObjectDisplayName(currentValue);
    const preview = buildJsonSummaryPreview(currentValue);
    setSummaryContent(`${objectName}(${visibleKeyCount})`, preview);
  };
  applySummaryText();
  details.appendChild(summary);

  let renderedChildren = false;
  const clearRenderedChildren = () => {
    while (details.lastElementChild && details.lastElementChild !== summary) {
      details.removeChild(details.lastElementChild);
    }
    renderedChildren = false;
  };
  const renderChildren = () => {
    if (renderedChildren) return;
    renderedChildren = true;

    const children = document.createElement('div');
    children.className = 'json-children';
    const sourceValue = currentValue;
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
      details.appendChild(children);
      return;
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
    } else {
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
    }

    details.appendChild(children);
  };

  details.addEventListener('toggle', () => {
    if (details.open) {
      renderChildren();
      if (shouldRuntimeRefreshOnExpand && !runtimeRefreshAttempted && !runtimeRefreshInFlight) {
        runtimeRefreshAttempted = true;
        runtimeRefreshInFlight = true;
        details.classList.add('json-loading');
        fetchSerializedValueAtPath(
          context.component,
          context.section,
          context.path,
          (nextValue) => {
            runtimeRefreshInFlight = false;
            details.classList.remove('json-loading');
            if (nextValue === null || !details.isConnected) return;
            currentValue = normalizeCollectionTokenForDisplayValue(nextValue);
            applySummaryText();
            if (details.open) {
              clearRenderedChildren();
              renderChildren();
            }
          },
        );
      }
      return;
    }
    clearRenderedChildren();
  });

  if (depth < 1) {
    details.open = true;
    renderChildren();
  }
  return details;
}

export { createObjectArrayJsonValueNode };
