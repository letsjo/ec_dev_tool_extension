type AnyRecord = Record<string, any>;

interface WalkInspectableComponentsArgs {
  rootFiber: AnyRecord;
  targetEl: Element | null;
  includeSerializedData: boolean;
  selectedComponentId: string | null;
  maxTraversal: number;
  maxComponents: number;
  isInspectableTag: (tag: number) => boolean;
  getDomInfoForFiber: (fiber: AnyRecord) => {
    domSelector: string | null;
    domPath: string | null;
    domTagName: string | null;
    containsTarget: boolean;
  };
  getStableFiberId: (fiber: AnyRecord | null | undefined, map: WeakMap<object, string>) => string | null;
  fiberIdMap: WeakMap<object, string>;
  getHooksInfo: (fiber: AnyRecord | null | undefined) => { value: unknown; count: number };
  getHooksCount: (fiber: AnyRecord | null | undefined) => number;
  serializePropsForFiber: (fiber: AnyRecord | null | undefined, serialize: (value: unknown, depth?: number) => unknown) => unknown;
  makeSerializer: (options: AnyRecord) => (value: unknown, depth?: number) => unknown;
  getFiberName: (fiber: AnyRecord) => string;
  getFiberKind: (tag: number) => string;
}

/** root fiber를 순회해 reactInspect 컴포넌트 목록/선택 후보 정보를 만든다. */
function walkInspectableComponents(args: WalkInspectableComponentsArgs) {
  const {
    rootFiber,
    targetEl,
    includeSerializedData,
    selectedComponentId,
    maxTraversal,
    maxComponents,
    isInspectableTag,
    getDomInfoForFiber,
    getStableFiberId,
    fiberIdMap,
    getHooksInfo,
    getHooksCount,
    serializePropsForFiber,
    makeSerializer,
    getFiberName,
    getFiberKind,
  } = args;
  const components: AnyRecord[] = [];
  const idByFiber = new Map<object, string>();
  let targetMatchedIndex = -1;
  let targetMatchedDepth = -1;

  const stack = [{ fiber: rootFiber, depth: -1, parentId: null as string | null }];
  let walkGuard = 0;

  while (stack.length > 0 && walkGuard < maxTraversal && components.length < maxComponents) {
    const item = stack.pop();
    const node = item?.fiber;
    if (!node) {
      walkGuard += 1;
      continue;
    }

    let childDepth = item.depth;
    let childParentId = item.parentId;

    if (isInspectableTag(node.tag)) {
      const domInfo = getDomInfoForFiber(node);
      const id = getStableFiberId(node, fiberIdMap) || String(components.length);
      const componentDepth = item.depth + 1;
      const shouldSerializeData = includeSerializedData || Boolean(selectedComponentId && id === selectedComponentId);

      let serializedProps = null;
      let serializedHooks = null;
      let hookCount = 0;
      if (shouldSerializeData) {
        const hooksInfo = getHooksInfo(node);
        serializedProps = serializePropsForFiber(
          node,
          makeSerializer({
            maxSerializeCalls: 32000,
            maxDepth: 2,
            maxArrayLength: 80,
            maxObjectKeys: 80,
            maxMapEntries: 60,
            maxSetEntries: 60,
          }),
        );
        serializedHooks = hooksInfo.value;
        hookCount = hooksInfo.count;
      } else {
        hookCount = getHooksCount(node);
      }

      if (domInfo.containsTarget && node.tag !== 5 && componentDepth >= targetMatchedDepth) {
        targetMatchedDepth = componentDepth;
        targetMatchedIndex = components.length;
      }

      components.push({
        id,
        parentId: item.parentId,
        name: getFiberName(node),
        kind: getFiberKind(node.tag),
        depth: componentDepth,
        props: serializedProps,
        hooks: serializedHooks,
        hookCount,
        hasSerializedData: shouldSerializeData,
        domSelector: domInfo.domSelector,
        domPath: domInfo.domPath,
        domTagName: domInfo.domTagName,
      });

      idByFiber.set(node, id);
      if (node.alternate) {
        idByFiber.set(node.alternate, id);
      }
      childDepth = item.depth + 1;
      childParentId = id;
    }

    if (node.sibling) {
      stack.push({ fiber: node.sibling, depth: item.depth, parentId: item.parentId });
    }
    if (node.child) {
      stack.push({ fiber: node.child, depth: childDepth, parentId: childParentId });
    }

    walkGuard += 1;
  }

  return {
    components,
    idByFiber,
    targetMatchedIndex,
  };
}

export { walkInspectableComponents };
