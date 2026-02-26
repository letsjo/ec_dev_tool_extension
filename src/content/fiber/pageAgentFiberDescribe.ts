type FiberLike = Record<string, any>;

/** root 방향으로 올라가 inspected 대상 root fiber를 복구한다. */
function findRootFiber(fiber: FiberLike) {
  let current = fiber;
  let guard = 0;
  while (current && current.return && guard < 260) {
    current = current.return;
    guard += 1;
  }
  if (current && current.tag === 3 && current.stateNode && current.stateNode.current) {
    return current.stateNode.current;
  }
  return current || fiber;
}

/** fiber tag 숫자를 표시용 kind 문자열로 매핑한다. */
function getFiberKind(tag: number) {
  const map: Record<number, string> = {
    0: "FunctionComponent",
    1: "ClassComponent",
    5: "HostComponent",
    11: "ForwardRef",
    14: "MemoComponent",
    15: "SimpleMemoComponent",
  };
  return map[tag] || "Tag#" + String(tag);
}

/** type/elementType를 사람이 읽을 수 있는 이름으로 해석한다. */
function resolveTypeName(type: unknown): string {
  if (!type) return "";
  if (typeof type === "string") return type;
  if (typeof type === "function") {
    const fn = type as { displayName?: string; name?: string };
    return fn.displayName || fn.name || "Anonymous";
  }
  if (typeof type === "object") {
    const objectType = type as {
      displayName?: unknown;
      render?: { displayName?: string; name?: string };
      type?: unknown;
    };
    if (typeof objectType.displayName === "string" && objectType.displayName) {
      return objectType.displayName;
    }
    if (typeof objectType.render === "function") {
      const render = objectType.render as { displayName?: string; name?: string };
      return render.displayName || render.name || "Anonymous";
    }
    if (objectType.type) return resolveTypeName(objectType.type);
  }
  return "";
}

/** fiber의 표시 이름을 type/elementType/tag 순으로 계산한다. */
function getFiberName(fiber: FiberLike) {
  return (
    resolveTypeName(fiber.type) ||
    resolveTypeName(fiber.elementType) ||
    getFiberKind(fiber.tag)
  );
}

/** React 컴포넌트 트리에 포함할 수 있는 fiber tag인지 판별 */
function isInspectableTag(tag: number) {
  return tag === 0 || tag === 1 || tag === 5 || tag === 11 || tag === 14 || tag === 15;
}

/** 선택 기준으로 적절한 fiber(HostComponent보다 상위 컴포넌트 우선)를 찾는다. */
function findPreferredSelectedFiber(startFiber: FiberLike) {
  let current = startFiber;
  let firstInspectable: FiberLike | null = null;
  let guard = 0;
  while (current && guard < 320) {
    if (isInspectableTag(current.tag)) {
      if (!firstInspectable) firstInspectable = current;
      if (current.tag !== 5) return current;
    }
    current = current.return;
    guard += 1;
  }
  return firstInspectable;
}

export {
  findPreferredSelectedFiber,
  findRootFiber,
  getFiberKind,
  getFiberName,
  isInspectableTag,
};
