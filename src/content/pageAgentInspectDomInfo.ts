type AnyRecord = Record<string, any>;

interface FiberLike extends AnyRecord {
  tag?: number;
  stateNode?: any;
  child?: FiberLike | null;
  sibling?: FiberLike | null;
}

interface GetDomInfoForFiberArgs {
  fiber: FiberLike | null | undefined;
  hostCache: Map<object, Element | null>;
  visiting: Set<object>;
  selectedEl: Element | null;
  buildCssSelector: (el: Element | null) => string;
  getElementPath: (el: Element | null) => string;
}

function getHostElementFromFiber(
  fiber: FiberLike | null | undefined,
  cache: Map<object, Element | null>,
  visiting: Set<object>,
): Element | null {
  if (!fiber) return null;
  if (cache.has(fiber)) return cache.get(fiber) || null;
  if (visiting.has(fiber)) return null;
  visiting.add(fiber);

  let result = null;
  if (fiber.tag === 5 && fiber.stateNode && fiber.stateNode.nodeType === 1) {
    result = fiber.stateNode;
  } else {
    let child = fiber.child;
    let guard = 0;
    while (child && guard < 900) {
      result = getHostElementFromFiber(child, cache, visiting);
      if (result) break;
      child = child.sibling;
      guard += 1;
    }
  }

  visiting.delete(fiber);
  cache.set(fiber, result);
  return result;
}

/** fiber 기준 host element를 찾아 DOM selector/path/target 포함 여부를 계산한다. */
function getDomInfoForFiber(args: GetDomInfoForFiberArgs) {
  const {
    fiber,
    hostCache,
    visiting,
    selectedEl,
    buildCssSelector,
    getElementPath,
  } = args;
  const element = getHostElementFromFiber(fiber, hostCache, visiting);
  if (!element) {
    return { domSelector: null, domPath: null, domTagName: null, containsTarget: false };
  }
  const selectorText = buildCssSelector(element);
  let containsTarget = false;
  if (selectedEl && selectedEl.nodeType === 1) {
    try {
      containsTarget = element === selectedEl || element.contains(selectedEl);
    } catch (_) {
      containsTarget = false;
    }
  }
  return {
    domSelector: selectorText || null,
    domPath: getElementPath(element),
    domTagName: String(element.tagName || "").toLowerCase(),
    containsTarget,
  };
}

export { getDomInfoForFiber };
