import type { HookRowItem, HookTreeNode } from './hookTreeTypes';

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

interface HookGroupTreeNode {
  type: 'group';
  title: string;
  children: HookTreeNode[];
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
export function buildExplicitHookTree(items: HookRowItem[]): HookTreeNode[] {
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
export function buildFallbackHookTree(items: HookRowItem[]): HookTreeNode[] {
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
