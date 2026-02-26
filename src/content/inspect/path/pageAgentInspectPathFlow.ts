import { resolveInspectPathModeResponse } from './pageAgentInspectPathMode';
import { parseInspectReactPathArgs } from './pageAgentInspectPathArgs';
import { resolveInspectPathTargetFiber, resolveInspectRootContext } from '../../pageAgentInspectTarget';
import { resolveInspectPathValue } from './pageAgentInspectPathValue';

type FiberLike = Record<string, unknown> & {
  memoizedProps?: unknown;
};

interface NearestFiberMatch {
  fiber: FiberLike;
  sourceElement: Element | null;
}

interface CreateInspectReactPathFlowOptions {
  resolveTargetElement: (selector: string, pickPoint: unknown) => Element | null;
  findNearestFiber: (startEl: Element | null) => NearestFiberMatch | null;
  findAnyFiberInDocument: () => NearestFiberMatch | null;
  findRootFiber: (fiber: FiberLike) => FiberLike | null;
  getFiberIdMap: () => WeakMap<object, string>;
  findFiberByComponentId: (
    rootFiber: FiberLike,
    componentId: string,
    fiberIdMap: WeakMap<object, string>,
  ) => FiberLike | null;
  findFiberByComponentIdAcrossDocument: (
    componentId: string,
    fiberIdMap: WeakMap<object, string>,
  ) => FiberLike | null;
  getHooksRootValue: (
    fiber: FiberLike | null | undefined,
    options: Record<string, unknown>,
  ) => unknown;
  resolveSpecialCollectionPathSegment: (
    currentValue: unknown,
    segment: string,
  ) => Record<string, unknown>;
  makeSerializer: (
    options: Record<string, unknown>,
  ) => (value: unknown, depth?: number) => unknown;
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

  return function inspectReactPath(args: Record<string, unknown> | null | undefined) {
    const parsed = parseInspectReactPathArgs(args);
    const { componentId, selector, pickPoint, section, path, mode, serializeLimit } = parsed;

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
    } catch (error) {
      const typedError = error as { message?: unknown } | null;
      return {
        ok: false,
        error: String(typedError && typedError.message ? typedError.message : error),
      };
    }
  };
}

export { createInspectReactPathFlow };
export type { CreateInspectReactPathFlowOptions };
