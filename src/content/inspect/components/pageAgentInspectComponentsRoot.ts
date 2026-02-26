import { resolveInspectRootContext } from '../../pageAgentInspectTarget';

type InspectFiber = {
  tag?: number;
  alternate?: InspectFiber | null;
  [key: string]: unknown;
};

interface ResolveInspectComponentsRootOptions {
  selector: string;
  pickPoint: unknown;
  selectedComponentId: string | null;
  includeSerializedData: boolean;
  resolveTargetElement: (selector: string, pickPoint: unknown) => Element | null;
  findNearestFiber: (startEl: Element | null) => { fiber: InspectFiber; sourceElement: Element | null } | null;
  findAnyFiberInDocument: () => { fiber: InspectFiber; sourceElement: Element | null } | null;
  findRootFiber: (fiber: InspectFiber) => InspectFiber | null;
  getFiberIdMap: () => WeakMap<object, string>;
  rootHasComponentId: (
    rootFiber: InspectFiber | null | undefined,
    componentId: string | null | undefined,
    fiberIdMap: WeakMap<object, string>,
  ) => boolean;
  findRootFiberByComponentId: (
    componentId: string | null | undefined,
    fiberIdMap: WeakMap<object, string>,
  ) => InspectFiber | null;
}

type ResolveInspectComponentsRootResult =
  | {
      ok: true;
      targetEl: Element | null;
      nearest: { fiber: InspectFiber; sourceElement: Element | null };
      rootFiber: InspectFiber;
      fiberIdMap: WeakMap<object, string>;
      hostCache: Map<object, Element | null>;
      visiting: Set<object>;
    }
  | {
      ok: false;
      error: string;
      selector: string;
      pickPoint?: unknown;
    };

/** reactInspect root 컨텍스트를 해석하고 lightweight fallback root 복원을 적용한다. */
function resolveInspectComponentsRootContext(
  options: ResolveInspectComponentsRootOptions,
): ResolveInspectComponentsRootResult {
  const resolvedRoot = resolveInspectRootContext({
    selector: options.selector,
    pickPoint: options.pickPoint,
    resolveTargetElement: options.resolveTargetElement,
    findNearestFiber: options.findNearestFiber,
    findAnyFiberInDocument: options.findAnyFiberInDocument,
    findRootFiber: options.findRootFiber,
  });
  if (!resolvedRoot.ok) {
    if (resolvedRoot.reason === 'missingNearest') {
      return {
        ok: false,
        error: 'React fiber를 찾을 수 없습니다. (React 16+ 필요)',
        selector: options.selector,
        pickPoint: options.pickPoint,
      };
    }
    return {
      ok: false,
      error: 'React root fiber를 찾을 수 없습니다.',
      selector: options.selector,
    };
  }

  const { targetEl, nearest } = resolvedRoot;
  let { rootFiber } = resolvedRoot;
  const hostCache = new Map<object, Element | null>();
  const visiting = new Set<object>();
  const fiberIdMap = options.getFiberIdMap();

  // selector 없이 lightweight refresh가 들어오면 기존 root에 selected id가 없는 경우가 있어
  // 문서 전체 fallback root를 재탐색해 selection 복원 안정성을 높인다.
  if (
    options.selectedComponentId &&
    !options.includeSerializedData &&
    !options.selector &&
    !options.rootHasComponentId(rootFiber, options.selectedComponentId, fiberIdMap)
  ) {
    const matchedRoot = options.findRootFiberByComponentId(options.selectedComponentId, fiberIdMap);
    if (matchedRoot) {
      rootFiber = matchedRoot;
    }
  }

  return {
    ok: true,
    targetEl,
    nearest,
    rootFiber,
    fiberIdMap,
    hostCache,
    visiting,
  };
}

export { resolveInspectComponentsRootContext };
export type { ResolveInspectComponentsRootOptions, ResolveInspectComponentsRootResult };
