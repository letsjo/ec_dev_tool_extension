import {
  isDehydratedToken,
  readObjectRefId,
} from '../../../shared/inspector/guards';
import type {
  JsonPathSegment,
  JsonSectionKind,
  ReactComponentInfo,
} from '../../../shared/inspector/types';
import {
  normalizeCollectionTokenForDisplay as normalizeCollectionTokenForDisplayValue,
  readDisplayCollectionMeta as readDisplayCollectionMetaValue,
  resolveDisplayChildPathSegment as resolveDisplayChildPathSegmentValue,
} from './collectionDisplay';
import {
  buildHookTree as buildHookTreeValue,
  type HookRowItem,
  type HookTreeNode,
} from './hookTreeModel';
import {
  createCircularRefNode as createCircularRefNodeValue,
  createFunctionTokenNode as createFunctionTokenNodeValue,
} from './jsonTokenNodes';
import {
  buildHookInlinePreview,
  buildJsonSummaryPreview,
  formatPrimitive,
  getObjectDisplayName,
  isJsonInternalMetaKey,
  readDehydratedPreviewText,
} from './jsonPreview';

type InspectFunctionAtPathHandler = (
  component: ReactComponentInfo,
  section: JsonSectionKind,
  path: JsonPathSegment[],
) => void;

type FetchSerializedValueAtPathHandler = (
  component: ReactComponentInfo,
  section: JsonSectionKind,
  path: JsonPathSegment[],
  onDone: (value: unknown | null) => void,
) => void;

interface JsonRenderContext {
  component: ReactComponentInfo;
  section: JsonSectionKind;
  path: JsonPathSegment[];
  refMap: Map<number, unknown>;
  refStack: number[];
  allowInspect: boolean;
}

const INLINE_CHILD_INDENT_PX = 16;

/**
 * controller의 pageAgent 브리지를 모듈 외부에 두고,
 * 렌더러는 콜백 핸들러를 통해서만 inspect/serialize를 호출한다.
 */
let currentInspectFunctionAtPathHandler: InspectFunctionAtPathHandler = () => {};
let currentFetchSerializedValueAtPathHandler: FetchSerializedValueAtPathHandler = (
  _component,
  _section,
  _path,
  onDone,
) => {
  onDone(null);
};

/** 경로 기준 inspect 동작을 수행 */
function inspectFunctionAtPath(
  component: ReactComponentInfo,
  section: JsonSectionKind,
  path: JsonPathSegment[],
) {
  currentInspectFunctionAtPathHandler(component, section, path);
}

/** 페이지/런타임 데이터를 조회 */
function fetchSerializedValueAtPath(
  component: ReactComponentInfo,
  section: JsonSectionKind,
  path: JsonPathSegment[],
  onDone: (value: unknown | null) => void,
) {
  currentFetchSerializedValueAtPathHandler(component, section, path, onDone);
}

function collectRefMap(root: unknown): Map<number, unknown> {
  const map = new Map<number, unknown>();
  const visited = new WeakSet<object>();
  let remaining = 4000;

  const walk = (value: unknown) => {
    if (remaining <= 0) return;
    if (value === null || typeof value !== 'object') return;
    if (visited.has(value)) return;
    visited.add(value);
    remaining -= 1;

    const refId = readObjectRefId(value);
    if (refId !== null && !map.has(refId)) {
      map.set(refId, value);
    }

    if (Array.isArray(value)) {
      const maxLen = Math.min(value.length, 80);
      for (let i = 0; i < maxLen && remaining > 0; i += 1) {
        walk(value[i]);
      }
      return;
    }

    let scannedKeys = 0;
    for (const [key, child] of Object.entries(value)) {
      if (isJsonInternalMetaKey(key)) continue;
      walk(child);
      scannedKeys += 1;
      if (scannedKeys >= 100 || remaining <= 0) break;
    }
  };

  walk(root);
  return map;
}

/** 렌더링에 사용할 DOM/데이터 구조를 생성 */
function createHookRowValueNode(
  value: unknown,
  context: JsonRenderContext,
  path: JsonPathSegment[],
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

/** 렌더링에 사용할 DOM/데이터 구조를 생성 */
function createExpandableValueRow(
  keyEl: HTMLElement,
  valueDetails: HTMLDetailsElement,
  extraClassName?: string,
): HTMLDivElement {
  const row = document.createElement('div');
  row.className = `json-row json-row-expandable${extraClassName ? ` ${extraClassName}` : ''}`;

  const toggleDetailsOpenState = () => {
    valueDetails.open = !valueDetails.open;
  };

  const toggle = createDetailsToggleButton(valueDetails);

  valueDetails.classList.add('json-inline-value');
  keyEl.classList.add('json-key-toggle');
  keyEl.setAttribute('role', 'button');
  keyEl.tabIndex = 0;
  keyEl.setAttribute('aria-expanded', valueDetails.open ? 'true' : 'false');

  keyEl.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    toggleDetailsOpenState();
  });
  keyEl.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    event.stopPropagation();
    toggleDetailsOpenState();
  });

  const syncInlineChildrenOffset = () => {
    if (!valueDetails.open) return;
    const children = valueDetails.querySelector(':scope > .json-children');
    if (!(children instanceof HTMLElement)) return;
    const rowRect = row.getBoundingClientRect();
    const detailsRect = valueDetails.getBoundingClientRect();
    const offset = detailsRect.left - rowRect.left;
    const targetMargin = INLINE_CHILD_INDENT_PX - offset;
    children.style.marginLeft = `${targetMargin}px`;
  };

  const scheduleInlineChildrenOffset = () => {
    requestAnimationFrame(syncInlineChildrenOffset);
  };

  valueDetails.addEventListener('toggle', () => {
    keyEl.setAttribute('aria-expanded', valueDetails.open ? 'true' : 'false');
    scheduleInlineChildrenOffset();
  });
  window.addEventListener('resize', scheduleInlineChildrenOffset);
  if (typeof MutationObserver === 'function') {
    const childrenObserver = new MutationObserver(() => {
      if (!row.isConnected || !valueDetails.open) return;
      scheduleInlineChildrenOffset();
    });
    childrenObserver.observe(valueDetails, { childList: true });
  }
  if (valueDetails.open) {
    scheduleInlineChildrenOffset();
  }

  row.appendChild(toggle);
  row.appendChild(keyEl);
  row.appendChild(document.createTextNode(': '));
  row.appendChild(valueDetails);
  return row;
}

/** 렌더링에 사용할 DOM/데이터 구조를 생성 */
function createDetailsToggleButton(detailsEl: HTMLDetailsElement): HTMLButtonElement {
  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'json-row-toggle';
  toggle.setAttribute('aria-label', 'Toggle row details');

  const syncToggle = () => {
    toggle.textContent = detailsEl.open ? '▾' : '▸';
  };
  syncToggle();

  toggle.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    detailsEl.open = !detailsEl.open;
  });
  detailsEl.addEventListener('toggle', syncToggle);
  return toggle;
}

/** 렌더링에 사용할 DOM/데이터 구조를 생성 */
function createRowToggleSpacer(): HTMLSpanElement {
  const spacer = document.createElement('span');
  spacer.className = 'json-row-toggle-spacer';
  spacer.setAttribute('aria-hidden', 'true');
  return spacer;
}

/** 생성한 노드를 컨테이너에 추가 */
function appendHookRow(container: HTMLElement, item: HookRowItem, context: JsonRenderContext) {
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

  const valueNode = createHookRowValueNode(item.state, context, [item.sourceIndex, 'state']);
  if (valueNode instanceof HTMLDetailsElement) {
    container.appendChild(createExpandableValueRow(keyEl, valueNode, 'json-hook-row'));
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

/** 생성한 노드를 컨테이너에 추가 */
function appendHookTree(container: HTMLElement, nodes: HookTreeNode[], context: JsonRenderContext) {
  nodes.forEach((node) => {
    if (node.type === 'item') {
      appendHookRow(container, node.item, context);
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
    appendHookTree(groupChildren, node.children, context);
    groupDetails.appendChild(groupChildren);
    container.appendChild(groupDetails);
  });
}

/** 렌더링에 사용할 DOM/데이터 구조를 생성 */
function createJsonValueNode(
  value: unknown,
  depth: number,
  context: JsonRenderContext,
): HTMLElement {
  const functionTokenNode = createFunctionTokenNodeValue({
    value,
    context,
    onInspectFunctionAtPath: inspectFunctionAtPath,
  });
  if (functionTokenNode) {
    return functionTokenNode;
  }

  const circularRefNode = createCircularRefNodeValue({
    value,
    depth,
    context,
    createJsonValueNode,
  });
  if (circularRefNode) {
    return circularRefNode;
  }

  if (isDehydratedToken(value)) {
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

      fetchSerializedValueAtPath(
        context.component,
        context.section,
        context.path,
        (nextValue) => {
          runtimeRefreshInFlight = false;
          details.classList.remove('json-loading');
          if (nextValue === null || !details.isConnected) return;

          runtimeRefreshDone = true;
          const normalized = normalizeCollectionTokenForDisplayValue(nextValue);
          const replacementNode = createJsonValueNode(normalized, depth, context);
          details.replaceWith(replacementNode);

          if (
            replacementNode instanceof HTMLDetailsElement &&
            !isDehydratedToken(normalized)
          ) {
            replacementNode.open = true;
          }
        },
      );
    });

    return details;
  }

  const normalizedCollectionValue = normalizeCollectionTokenForDisplayValue(value);
  if (normalizedCollectionValue !== value) {
    return createJsonValueNode(normalizedCollectionValue, depth, context);
  }

  if (normalizedCollectionValue === null || typeof normalizedCollectionValue !== 'object') {
    const primitive = document.createElement('span');
    primitive.className = 'json-primitive';
    primitive.textContent = formatPrimitive(normalizedCollectionValue);
    return primitive;
  }

  const details = document.createElement('details');
  details.className = 'json-node';

  const summary = document.createElement('summary');
  let currentValue: unknown = normalizedCollectionValue;
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
          children.appendChild(createExpandableValueRow(keyEl, childNode));
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
            clearRenderedChildren();
            if (details.open) {
              renderChildren();
            }
          },
        );
      }
    }
  });
  if (depth < 1) {
    details.open = true;
    renderChildren();
  }
  return details;
}

/** 렌더링에 사용할 DOM/데이터 구조를 생성 */
function createJsonSection(
  title: string,
  value: unknown,
  component: ReactComponentInfo,
  sectionKind: JsonSectionKind,
): HTMLElement {
  const sectionEl = document.createElement('div');
  sectionEl.className = 'json-section';

  const sectionTitle = document.createElement('div');
  sectionTitle.className = 'json-section-title';
  sectionTitle.textContent = title;
  sectionEl.appendChild(sectionTitle);

  const refMap = collectRefMap(value);
  const baseContext: JsonRenderContext = {
    component,
    section: sectionKind,
    path: [],
    refMap,
    refStack: [],
    allowInspect: true,
  };

  if (sectionKind === 'hooks' && Array.isArray(value)) {
    const hooksRows = document.createElement('div');
    hooksRows.className = 'json-children';

    if (value.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'json-row';
      empty.textContent = '(empty)';
      hooksRows.appendChild(empty);
    } else {
      const tree = buildHookTreeValue(value);
      appendHookTree(hooksRows, tree, baseContext);
    }

    sectionEl.appendChild(hooksRows);
    return sectionEl;
  }

  sectionEl.appendChild(createJsonValueNode(value, 0, baseContext));
  return sectionEl;
}

export interface CreateReactJsonSectionOptions {
  title: string;
  value: unknown;
  component: ReactComponentInfo;
  sectionKind: JsonSectionKind;
  onInspectFunctionAtPath: InspectFunctionAtPathHandler;
  onFetchSerializedValueAtPath: FetchSerializedValueAtPathHandler;
}

/** React 상세 패널 JSON/hook 섹션 DOM을 생성한다. */
export function createReactJsonSection(options: CreateReactJsonSectionOptions): HTMLElement {
  currentInspectFunctionAtPathHandler = options.onInspectFunctionAtPath;
  currentFetchSerializedValueAtPathHandler = options.onFetchSerializedValueAtPath;
  return createJsonSection(
    options.title,
    options.value,
    options.component,
    options.sectionKind,
  );
}
