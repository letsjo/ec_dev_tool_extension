// @ts-nocheck
import { resolveInspectPathModeResponse } from './pageAgentInspectPathMode';
import { resolveInspectPathTargetFiber, resolveInspectRootContext } from './pageAgentInspectTarget';
import { resolveInspectPathValue } from './pageAgentInspectPathValue';

type AnyRecord = Record<string, any>;

interface CreateInspectReactPathFlowOptions {
  resolveTargetElement: (selector: string, pickPoint: unknown) => Element | null;
  findNearestFiber: (startEl: Element | null) => { fiber: AnyRecord; sourceElement: Element | null } | null;
  findAnyFiberInDocument: () => { fiber: AnyRecord; sourceElement: Element | null } | null;
  findRootFiber: (fiber: AnyRecord) => AnyRecord | null;
  getFiberIdMap: () => WeakMap<object, string>;
  findFiberByComponentId: (
    rootFiber: AnyRecord,
    componentId: string,
    fiberIdMap: WeakMap<object, string>,
  ) => AnyRecord | null;
  findFiberByComponentIdAcrossDocument: (
    componentId: string,
    fiberIdMap: WeakMap<object, string>,
  ) => AnyRecord | null;
  getHooksRootValue: (fiber: AnyRecord | null | undefined, options: AnyRecord) => any;
  resolveSpecialCollectionPathSegment: (currentValue: unknown, segment: string) => AnyRecord;
  makeSerializer: (options: AnyRecord) => (value: unknown, depth?: number) => unknown;
  registerFunctionForInspect: (value: Function) => string;
}

/** reactInspectPath 흐름(대상 fiber 조회 + path resolve + mode 응답 조립)을 구성한다. */
function createInspectReactPathFlow(options: CreateInspectReactPathFlowOptions) {
  const {
    resolveTargetElement,
    findNearestFiber,
    findAnyFiberInDocument,
    findRootFiber,
    getFiberIdMap,
    findFiberByComponentId,
    findFiberByComponentIdAcrossDocument,
    getHooksRootValue,
    resolveSpecialCollectionPathSegment,
    makeSerializer,
    registerFunctionForInspect,
  } = options;

  return function inspectReactPath(args: AnyRecord | null | undefined) {
    const componentId = typeof args?.componentId === 'string' ? args.componentId : '';
    const selector = typeof args?.selector === 'string' ? args.selector : '';
    const pickPoint = args?.pickPoint;
    const section = args?.section === 'hooks' ? 'hooks' : 'props';
    const path = Array.isArray(args?.path) ? args.path : [];
    const mode = args?.mode === 'inspectFunction' ? 'inspectFunction' : 'serializeValue';
    const serializeLimit = Number.isFinite(args?.serializeLimit)
      ? Math.max(1000, Math.floor(args.serializeLimit))
      : 45000;

    try {
      if (!componentId) {
        return { ok: false, error: 'componentId가 필요합니다.' };
      }

      const resolvedRoot = resolveInspectRootContext({
        selector,
        pickPoint,
        resolveTargetElement,
        findNearestFiber,
        findAnyFiberInDocument,
        findRootFiber,
      });
      if (!resolvedRoot.ok) {
        if (resolvedRoot.reason === 'missingNearest') {
          return { ok: false, error: 'React fiber를 찾지 못했습니다.' };
        }
        return { ok: false, error: 'React root fiber를 찾지 못했습니다.' };
      }
      const fiberIdMap = getFiberIdMap();
      const { rootFiber } = resolvedRoot;
      const targetFiber = resolveInspectPathTargetFiber({
        rootFiber,
        componentId,
        fiberIdMap,
        findFiberByComponentId,
        findFiberByComponentIdAcrossDocument,
      });
      if (!targetFiber) {
        return { ok: false, error: '대상 컴포넌트를 찾지 못했습니다.' };
      }

      const rootValue =
        section === 'props'
          ? targetFiber.memoizedProps
          : getHooksRootValue(targetFiber, { includeCustomGroups: true });
      const pathResolved = resolveInspectPathValue({
        initialValue: rootValue,
        path,
        resolveSpecialCollectionPathSegment,
      });
      if (!pathResolved.ok) {
        return pathResolved;
      }
      const value = pathResolved.value;
      return resolveInspectPathModeResponse({
        mode,
        value,
        serializeLimit,
        makeSerializer,
        registerFunctionForInspect,
      });
    } catch (e) {
      return { ok: false, error: String(e && e.message) };
    }
  };
}

export { createInspectReactPathFlow };
