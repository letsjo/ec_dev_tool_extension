import { isRecord } from '../../../shared/inspector/guards';

const BUILTIN_HOOK_NAME_SET = new Set([
  'State',
  'Reducer',
  'Effect',
  'LayoutEffect',
  'InsertionEffect',
  'ImperativeHandle',
  'Memo',
  'Callback',
  'Ref',
  'DeferredValue',
  'Transition',
  'SyncExternalStore',
  'Id',
  'DebugValue',
  'ClassState',
  'Truncated',
  'Hook',
]);

const EFFECT_HOOK_NAME_SET = new Set([
  'Effect',
  'LayoutEffect',
  'InsertionEffect',
  'ImperativeHandle',
  'EffectEvent',
]);

const FUNCTION_HOOK_NAME_SET = new Set(['Callback', 'Memo']);

type HookBadgeType = 'effect' | 'function';

export interface HookRowItem {
  sourceIndex: number;
  order: number;
  name: string;
  group: string | null;
  groupPath: string[] | null;
  badge: HookBadgeType | null;
  state: unknown;
}

interface HookGroupTreeNode {
  type: 'group';
  title: string;
  children: HookTreeNode[];
}

interface HookItemTreeNode {
  type: 'item';
  item: HookRowItem;
}

export type HookTreeNode = HookGroupTreeNode | HookItemTreeNode;

/** 필요한 값/상태를 계산해 반환 */
function getHookBadgeType(name: string): HookBadgeType | null {
  if (EFFECT_HOOK_NAME_SET.has(name)) return 'effect';
  if (FUNCTION_HOOK_NAME_SET.has(name)) return 'function';
  return null;
}

/** 입력 데이터를 표시/비교용으로 정규화 */
function normalizeHookGroupLabel(label: string): string {
  const trimmed = label.trim();
  if (!trimmed) return '';
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

/** 입력 데이터를 표시/비교용으로 정규화 */
function normalizeHookGroupPath(rawGroupPath: unknown): string[] | null {
  if (!Array.isArray(rawGroupPath)) return null;
  const normalized = rawGroupPath
    .filter((segment): segment is string => typeof segment === 'string')
    .map((segment) => normalizeHookGroupLabel(segment))
    .filter((segment) => Boolean(segment));
  return normalized.length > 0 ? normalized : null;
}

/** 값을 읽어 검증/변환 */
function readHookRowItem(hook: unknown, arrayIndex: number): HookRowItem {
  const hookRecord = isRecord(hook) ? hook : null;
  const hookIndexRaw = hookRecord?.index;
  const hookNameRaw = hookRecord?.name;
  const hookGroupRaw = hookRecord?.group;
  const hookGroupPathRaw = hookRecord?.groupPath;
  const hookState = hookRecord && 'state' in hookRecord ? hookRecord.state : hook;

  const order =
    typeof hookIndexRaw === 'number' && Number.isFinite(hookIndexRaw) && hookIndexRaw >= 0
      ? Math.floor(hookIndexRaw) + 1
      : arrayIndex + 1;
  const rawName =
    typeof hookNameRaw === 'string' && hookNameRaw.trim() ? hookNameRaw.trim() : 'Hook';
  const name = rawName.charAt(0).toUpperCase() + rawName.slice(1);
  const group =
    typeof hookGroupRaw === 'string' && hookGroupRaw.trim()
      ? normalizeHookGroupLabel(hookGroupRaw)
      : null;
  const normalizedGroupPath = normalizeHookGroupPath(hookGroupPathRaw);
  const groupPath = normalizedGroupPath ?? (group ? [group] : null);

  return {
    sourceIndex: arrayIndex,
    order,
    name,
    group,
    groupPath,
    badge: getHookBadgeType(name),
    state: hookState,
  };
}

/** 렌더링에 사용할 DOM/데이터 구조를 생성 */
function createHookGroupNode(title: string): HookGroupTreeNode {
  return {
    type: 'group',
    title,
    children: [],
  };
}

/** 해당 기능 흐름을 처리 */
function pruneEmptyHookGroups(nodes: HookTreeNode[]): HookTreeNode[] {
  const out: HookTreeNode[] = [];
  nodes.forEach((node) => {
    if (node.type === 'item') {
      out.push(node);
      return;
    }
    node.children = pruneEmptyHookGroups(node.children);
    if (node.children.length > 0) {
      out.push(node);
    }
  });
  return out;
}

/** 파생 데이터나 요약 값을 구성 */
function buildExplicitHookTree(items: HookRowItem[]): HookTreeNode[] {
  const root: HookTreeNode[] = [];
  const groupStack: HookGroupTreeNode[] = [];
  let previousPath: string[] = [];

  items.forEach((item) => {
    /** 공통 prefix 스택을 재사용해 중첩 그룹 트리를 안정적으로 구성한다. */
    const currentPath = item.groupPath ? [...item.groupPath] : [];
    let sharedDepth = 0;
    while (
      sharedDepth < previousPath.length &&
      sharedDepth < currentPath.length &&
      previousPath[sharedDepth] === currentPath[sharedDepth]
    ) {
      sharedDepth += 1;
    }

    groupStack.length = sharedDepth;
    let targetChildren = groupStack.length > 0 ? groupStack[groupStack.length - 1].children : root;

    for (let depth = sharedDepth; depth < currentPath.length; depth += 1) {
      const nextGroup = createHookGroupNode(currentPath[depth]);
      targetChildren.push(nextGroup);
      groupStack.push(nextGroup);
      targetChildren = nextGroup.children;
    }

    targetChildren.push({
      type: 'item',
      item,
    });
    previousPath = currentPath;
  });

  return pruneEmptyHookGroups(root);
}

/** 파생 데이터나 요약 값을 구성 */
function buildFallbackHookTree(items: HookRowItem[]): HookTreeNode[] {
  const tree: HookTreeNode[] = [];
  let activeGroup: HookGroupTreeNode | null = null;

  items.forEach((item) => {
    const isBuiltin = BUILTIN_HOOK_NAME_SET.has(item.name);
    if (!isBuiltin) {
      activeGroup = createHookGroupNode(item.name);
      tree.push(activeGroup);
      return;
    }

    const hookNode: HookTreeNode = {
      type: 'item',
      item,
    };
    if (activeGroup) {
      activeGroup.children.push(hookNode);
    } else {
      tree.push(hookNode);
    }
  });

  return pruneEmptyHookGroups(tree);
}

/** 파생 데이터나 요약 값을 구성 */
export function buildHookTree(hooks: unknown[]): HookTreeNode[] {
  const normalizedItems = hooks.map((hook, arrayIndex) => readHookRowItem(hook, arrayIndex));
  const hasExplicitGroupPath = normalizedItems.some(
    (item) => item.groupPath && item.groupPath.length > 0,
  );
  if (hasExplicitGroupPath) {
    return buildExplicitHookTree(normalizedItems);
  }
  return buildFallbackHookTree(normalizedItems);
}
