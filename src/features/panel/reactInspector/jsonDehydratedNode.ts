import { isDehydratedToken } from '../../../shared/inspector/guards';
import type {
  FetchSerializedValueAtPathHandler,
  JsonInspectPathContext as JsonDehydratedRenderContext,
} from './jsonRenderTypes';
import { normalizeCollectionTokenForDisplay as normalizeCollectionTokenForDisplayValue } from './collectionDisplay';
import { readDehydratedPreviewText } from './jsonPreview';

export interface CreateDehydratedTokenNodeOptions {
  value: unknown;
  depth: number;
  context: JsonDehydratedRenderContext;
  fetchSerializedValueAtPath: FetchSerializedValueAtPathHandler;
  createReplacementJsonValueNode: (value: unknown, depth: number) => HTMLElement;
}

/** dehydrated token의 lazy expand/refresh 상세 노드를 생성한다. */
export function createDehydratedTokenNode(
  options: CreateDehydratedTokenNodeOptions,
): HTMLElement | null {
  const { value, depth, context, fetchSerializedValueAtPath, createReplacementJsonValueNode } =
    options;
  if (!isDehydratedToken(value)) return null;

  const canRuntimeInspect =
    context.allowInspect &&
    (context.section === 'props' || context.section === 'hooks') &&
    (context.path.length > 0 || depth === 0);
  if (!canRuntimeInspect) {
    const text = document.createElement('span');
    text.className = 'json-primitive';
    text.textContent = readDehydratedPreviewText(value);
    return text;
  }

  const details = document.createElement('details');
  details.className = 'json-node';

  const summary = document.createElement('summary');
  const previewText = readDehydratedPreviewText(value);
  const metaText = typeof value.reason === 'string' && value.reason ? value.reason : null;
  if (metaText) {
    const meta = document.createElement('span');
    meta.className = 'json-summary-meta';
    meta.textContent = metaText;
    summary.appendChild(meta);
    summary.appendChild(document.createTextNode(' '));
  }
  const preview = document.createElement('span');
  preview.className = 'json-summary-preview';
  preview.textContent = previewText;
  summary.appendChild(preview);
  details.appendChild(summary);

  let runtimeRefreshInFlight = false;
  let runtimeRefreshDone = false;
  details.addEventListener('toggle', () => {
    if (!details.open || runtimeRefreshInFlight || runtimeRefreshDone) return;
    runtimeRefreshInFlight = true;
    details.classList.add('json-loading');

    fetchSerializedValueAtPath(context.component, context.section, context.path, (nextValue) => {
      runtimeRefreshInFlight = false;
      details.classList.remove('json-loading');
      if (nextValue === null || !details.isConnected) return;

      runtimeRefreshDone = true;
      const normalized = normalizeCollectionTokenForDisplayValue(nextValue);
      const replacementNode = createReplacementJsonValueNode(normalized, depth);
      details.replaceWith(replacementNode);

      if (replacementNode instanceof HTMLDetailsElement && !isDehydratedToken(normalized)) {
        replacementNode.open = true;
      }
    });
  });

  return details;
}
