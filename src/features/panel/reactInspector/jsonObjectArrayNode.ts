import {
  normalizeCollectionTokenForDisplay as normalizeCollectionTokenForDisplayValue,
} from './collectionDisplay';
import type {
  FetchSerializedValueAtPathHandler,
  JsonRenderContext as JsonObjectArrayRenderContext,
} from './jsonRenderTypes';
import { buildObjectArraySummary } from './jsonObjectArraySummary';
import { createObjectArrayChildrenNode as createObjectArrayChildrenNodeValue } from './jsonObjectArrayChildren';

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
    const summaryData = buildObjectArraySummary(currentValue, context.section);
    setSummaryContent(summaryData.metaText, summaryData.previewText);
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
    details.appendChild(
      createObjectArrayChildrenNodeValue({
        sourceValue: currentValue,
        depth,
        context,
        createJsonValueNode,
      }),
    );
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
