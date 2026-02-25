type AnyRecord = Record<string, any>;

interface ResolveInspectRootContextArgs {
  selector: string;
  pickPoint: unknown;
  resolveTargetElement: (selector: string, pickPoint: unknown) => Element | null;
  findNearestFiber: (startEl: Element | null) => { fiber: AnyRecord; sourceElement: Element | null } | null;
  findAnyFiberInDocument: () => { fiber: AnyRecord; sourceElement: Element | null } | null;
  findRootFiber: (fiber: AnyRecord) => AnyRecord | null;
}

type InspectRootContextResult =
  | {
    ok: true;
    targetEl: Element | null;
    nearest: { fiber: AnyRecord; sourceElement: Element | null };
    rootFiber: AnyRecord;
  }
  | { ok: false; reason: "missingNearest" | "missingRoot" };

interface ResolveInspectPathTargetFiberArgs {
  rootFiber: AnyRecord;
  componentId: string;
  fiberIdMap: WeakMap<object, string>;
  findFiberByComponentId: (
    rootFiber: AnyRecord,
    componentId: string,
    fiberIdMap: WeakMap<object, string>,
  ) => AnyRecord | null;
  findFiberByComponentIdAcrossDocument: (
    componentId: string,
    fiberIdMap: WeakMap<object, string>,
  ) => AnyRecord | null;
}

/** selector/pickPoint 기준으로 inspect 대상 element -> nearest fiber -> root fiber를 해석한다. */
function resolveInspectRootContext(
  args: ResolveInspectRootContextArgs,
): InspectRootContextResult {
  const {
    selector,
    pickPoint,
    resolveTargetElement,
    findNearestFiber,
    findAnyFiberInDocument,
    findRootFiber,
  } = args;
  const targetEl = resolveTargetElement(selector, pickPoint);
  let nearest = targetEl ? findNearestFiber(targetEl) : null;
  if (!nearest || !nearest.fiber) {
    nearest = findAnyFiberInDocument();
  }
  if (!nearest || !nearest.fiber) {
    return { ok: false, reason: "missingNearest" };
  }
  const rootFiber = findRootFiber(nearest.fiber);
  if (!rootFiber) {
    return { ok: false, reason: "missingRoot" };
  }
  return {
    ok: true,
    targetEl,
    nearest,
    rootFiber,
  };
}

/** root 기준 componentId 탐색이 실패하면 문서 전체 fallback 탐색을 수행한다. */
function resolveInspectPathTargetFiber(args: ResolveInspectPathTargetFiberArgs) {
  const {
    rootFiber,
    componentId,
    fiberIdMap,
    findFiberByComponentId,
    findFiberByComponentIdAcrossDocument,
  } = args;
  let targetFiber = findFiberByComponentId(rootFiber, componentId, fiberIdMap);
  if (!targetFiber) {
    targetFiber = findFiberByComponentIdAcrossDocument(componentId, fiberIdMap);
  }
  return targetFiber;
}

export {
  resolveInspectPathTargetFiber,
  resolveInspectRootContext,
};
