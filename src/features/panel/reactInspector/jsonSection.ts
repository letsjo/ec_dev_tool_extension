import { readObjectRefId } from '../../../shared/inspector/guards';
import type {
  JsonPathSegment,
  JsonSectionKind,
  ReactComponentInfo,
} from '../../../shared/inspector/types';
import {
  buildHookTree as buildHookTreeValue,
  type HookRowItem,
  type HookTreeNode,
} from './hookTreeModel';
import type {
  FetchSerializedValueAtPathHandler,
  InspectFunctionAtPathHandler,
  JsonRenderContext,
} from './jsonRenderTypes';
import {
  createDetailsToggleButton,
  createExpandableValueRow,
  createRowToggleSpacer,
} from './jsonRowUi';
import { isJsonInternalMetaKey } from './jsonPreview';
import { createJsonValueNodeRenderer } from './jsonValueNode';

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

const createJsonValueNode = createJsonValueNodeRenderer({
  onInspectFunctionAtPath: inspectFunctionAtPath,
  fetchSerializedValueAtPath,
});

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
