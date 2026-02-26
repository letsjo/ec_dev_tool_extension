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
    return {
      domSelector: null,
      domPath: null,
      domTagName: null,
      containsTarget: false,
      targetContainDistance: null,
    };
  }
  const selectorText = buildCssSelector(element);
  let containsTarget = false;
  let targetContainDistance: number | null = null;
  if (selectedEl && selectedEl.nodeType === 1) {
    try {
      if (element === selectedEl) {
        containsTarget = true;
        targetContainDistance = 0;
      } else if (element.contains(selectedEl)) {
        containsTarget = true;
        let cursor: Element | null = selectedEl;
        let distance = 0;
        while (cursor && cursor !== element && distance < 512) {
          cursor = cursor.parentElement;
          distance += 1;
        }
        targetContainDistance = cursor === element ? distance : null;
      }
    } catch (_) {
      containsTarget = false;
      targetContainDistance = null;
    }
  }
  return {
    domSelector: selectorText || null,
    domPath: getElementPath(element),
    domTagName: String(element.tagName || "").toLowerCase(),
    containsTarget,
    targetContainDistance,
  };
}

export { getDomInfoForFiber };
