import { scanDocumentFiberRoots } from "./pageAgentFiberSearchDomScan";
import {
  findFiberByComponentIdInTree,
  rootHasComponentIdInTree,
} from "./pageAgentFiberSearchTree";
import type {
  CreatePageAgentFiberSearchHelpersOptions,
  FiberLike,
} from "./pageAgentFiberSearchTypes";

/** componentId 기반 fiber/root 탐색 유틸을 구성한다. */
export function createPageAgentFiberSearchHelpers(options: CreatePageAgentFiberSearchHelpersOptions) {
  const {
    maxTraversal,
    isInspectableTag,
    getStableFiberId,
    getReactFiberFromElement,
    findRootFiber,
  } = options;

  /** 해당 root tree에 componentId가 존재하는지 확인 */
  function rootHasComponentId(
    rootFiber: FiberLike | null | undefined,
    componentId: string | null | undefined,
    fiberIdMap: WeakMap<object, string>,
  ) {
    return rootHasComponentIdInTree({
      rootFiber,
      componentId,
      maxTraversal,
      isInspectableTag,
      getStableFiberId,
      fiberIdMap,
    });
  }

  /** 문서 전체를 스캔해 componentId를 포함하는 root fiber를 찾는다. */
  function findRootFiberByComponentId(
    componentId: string | null | undefined,
    fiberIdMap: WeakMap<object, string>,
  ) {
    if (!componentId) return null;
    return scanDocumentFiberRoots({
      maxScan: 7000,
      getReactFiberFromElement,
      findRootFiber,
      onRootFiber(rootFiber) {
        return rootHasComponentId(rootFiber, componentId, fiberIdMap) ? rootFiber : null;
      },
    });
  }

  /** root tree 내부에서 componentId로 fiber를 찾는다. */
  function findFiberByComponentId(
    rootFiber: FiberLike | null | undefined,
    targetId: string | null | undefined,
    fiberIdMap: WeakMap<object, string>,
  ) {
    return findFiberByComponentIdInTree({
      rootFiber,
      targetId,
      maxTraversal,
      isInspectableTag,
      getStableFiberId,
      fiberIdMap,
    });
  }

  /** 현재 root에서 못 찾은 경우 문서 전체 root를 스캔해 componentId fiber를 찾는다. */
  function findFiberByComponentIdAcrossDocument(
    targetId: string | null | undefined,
    fiberIdMap: WeakMap<object, string>,
  ) {
    if (!targetId) return null;
    return scanDocumentFiberRoots({
      maxScan: 8000,
      getReactFiberFromElement,
      findRootFiber,
      onRootFiber(rootFiber) {
        return findFiberByComponentId(rootFiber, targetId, fiberIdMap);
      },
    });
  }

  return {
    rootHasComponentId,
    findRootFiberByComponentId,
    findFiberByComponentId,
    findFiberByComponentIdAcrossDocument,
  };
}
