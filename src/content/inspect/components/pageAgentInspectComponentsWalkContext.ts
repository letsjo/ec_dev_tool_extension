import { walkInspectableComponents } from '../../pageAgentInspectComponentWalk';
import { getDomInfoForFiber } from '../../pageAgentInspectDomInfo';
import type { ReactComponentInfo } from '../../../shared/inspector/types';

type InspectFiber = {
  tag?: number;
  stateNode?: unknown;
  child?: InspectFiber | null;
  sibling?: InspectFiber | null;
  alternate?: InspectFiber | null;
  [key: string]: unknown;
};

type Serializer = (value: unknown, depth?: number) => unknown;

interface RunInspectComponentsWalkOptions {
  rootFiber: InspectFiber;
  targetEl: Element | null;
  includeSerializedData: boolean;
  selectedComponentId: string | null;
  maxTraversal: number;
  maxComponents: number;
  isInspectableTag: (tag: number) => boolean;
  hostCache: Map<object, Element | null>;
  visiting: Set<object>;
  buildCssSelector: (el: Element | null) => string;
  getElementPath: (el: Element | null) => string;
  getStableFiberId: (fiber: InspectFiber | null | undefined, map: WeakMap<object, string>) => string | null;
  fiberIdMap: WeakMap<object, string>;
  getHooksInfo: (fiber: InspectFiber | null | undefined) => { value: unknown; count: number };
  getHooksCount: (fiber: InspectFiber | null | undefined) => number;
  serializePropsForFiber: (fiber: InspectFiber | null | undefined, serialize: Serializer) => unknown;
  makeSerializer: (options: Record<string, unknown>) => Serializer;
  getFiberName: (fiber: InspectFiber) => string;
  getFiberKind: (tag: number) => string;
}

interface InspectComponentsWalkResult {
  components: ReactComponentInfo[];
  idByFiber: Map<object, string>;
  targetMatchedIndex: number;
}

/** reactInspect component walk 호출에 필요한 타입/캐시 결선을 조립한다. */
function runInspectComponentsWalk(options: RunInspectComponentsWalkOptions): InspectComponentsWalkResult {
  const walked = walkInspectableComponents({
    rootFiber: options.rootFiber as Record<string, unknown>,
    targetEl: options.targetEl,
    includeSerializedData: options.includeSerializedData,
    selectedComponentId: options.selectedComponentId,
    maxTraversal: options.maxTraversal,
    maxComponents: options.maxComponents,
    isInspectableTag: options.isInspectableTag,
    getDomInfoForFiber(fiber: Record<string, unknown>) {
      return getDomInfoForFiber({
        fiber: fiber as InspectFiber,
        hostCache: options.hostCache,
        visiting: options.visiting,
        selectedEl: options.targetEl,
        buildCssSelector: options.buildCssSelector,
        getElementPath: options.getElementPath,
      });
    },
    getStableFiberId: (fiber, map) => options.getStableFiberId(fiber as InspectFiber | null, map),
    fiberIdMap: options.fiberIdMap,
    getHooksInfo: (fiber) => options.getHooksInfo(fiber as InspectFiber | null),
    getHooksCount: (fiber) => options.getHooksCount(fiber as InspectFiber | null),
    serializePropsForFiber: (fiber, serialize) =>
      options.serializePropsForFiber(fiber as InspectFiber | null, serialize),
    makeSerializer: options.makeSerializer,
    getFiberName: (fiber) => options.getFiberName(fiber as InspectFiber),
    getFiberKind: options.getFiberKind,
  });

  return {
    components: walked.components as ReactComponentInfo[],
    idByFiber: walked.idByFiber,
    targetMatchedIndex: walked.targetMatchedIndex,
  };
}

export { runInspectComponentsWalk };
export type { RunInspectComponentsWalkOptions, InspectComponentsWalkResult };
