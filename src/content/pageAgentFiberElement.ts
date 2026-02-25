/** DOM element 내부 react fiber key를 스캔해 fiber를 복구한다. */
function getReactFiberFromElement(el: Element | null) {
  if (!el) return null;
  const seenKeys: Record<string, true> = {};

  function readFiberByKey(key: string) {
    if (!key || typeof key !== "string") return null;
    if (key.indexOf("__reactFiber$") === 0 || key.indexOf("__reactInternalInstance$") === 0) {
      try {
        return (el as unknown as Record<string, unknown>)[key];
      } catch (_) {
        return null;
      }
    }
    if (key.indexOf("__reactContainer$") === 0) {
      let container: any = null;
      try {
        container = (el as unknown as Record<string, unknown>)[key];
      } catch (_) {
        return null;
      }
      if (container && container.current) return container.current;
      return container;
    }
    return null;
  }

  function scanKeys(keys: string[] | null) {
    if (!keys || typeof keys.length !== "number") return null;
    for (let i = 0; i < keys.length; i += 1) {
      const key = keys[i];
      if (seenKeys[key]) continue;
      seenKeys[key] = true;
      const fiber = readFiberByKey(key);
      if (fiber) return fiber;
    }
    return null;
  }

  let ownKeys: string[] | null = null;
  try {
    ownKeys = Object.getOwnPropertyNames(el);
  } catch (_) {}
  const ownFound = scanKeys(ownKeys);
  if (ownFound) return ownFound;

  let enumKeys: string[] | null = null;
  try {
    enumKeys = Object.keys(el);
  } catch (_) {}
  const enumFound = scanKeys(enumKeys);
  if (enumFound) return enumFound;

  for (const key in el) {
    if (seenKeys[key]) continue;
    seenKeys[key] = true;
    const found = readFiberByKey(key);
    if (found) return found;
  }

  return null;
}

/** 시작 element에서 부모 방향으로 가장 가까운 fiber를 찾는다. */
function findNearestFiber(startEl: Element | null) {
  let current = startEl;
  let guard = 0;
  while (current && current.nodeType === 1 && guard < 40) {
    const fiber = getReactFiberFromElement(current);
    if (fiber) return { fiber, sourceElement: current };
    current = current.parentElement;
    guard += 1;
  }
  return null;
}

/** 문서 전체에서 임의의 react fiber 하나를 찾는다. */
function findAnyFiberInDocument() {
  const rootEl = document.body || document.documentElement;
  if (!rootEl) return null;

  const queue: Element[] = [rootEl as Element];
  let cursor = 0;
  let guard = 0;
  const maxScan = 7000;

  while (cursor < queue.length && guard < maxScan) {
    const current = queue[cursor++];
    const fiber = getReactFiberFromElement(current);
    if (fiber) {
      return { fiber, sourceElement: current };
    }

    const children = current.children;
    if (children && children.length) {
      for (let i = 0; i < children.length; i += 1) {
        const child = children.item(i);
        if (child) {
          queue.push(child);
        }
      }
    }
    guard += 1;
  }
  return null;
}

export {
  findAnyFiberInDocument,
  findNearestFiber,
  getReactFiberFromElement,
};
