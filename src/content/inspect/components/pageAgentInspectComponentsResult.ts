import { buildSourceElementSummary } from './pageAgentInspectComponentsSource';
import { getDomInfoForFiber } from '../../pageAgentInspectDomInfo';
import { resolveSelectedComponentIndex } from '../../pageAgentInspectSelection';
import type { SourceElementSummary } from './pageAgentInspectComponentsSource';
import type { ReactComponentInfo } from '../../../shared/inspector';

type InspectFiber = {
  tag?: number;
  stateNode?: unknown;
  child?: InspectFiber | null;
  sibling?: InspectFiber | null;
  alternate?: InspectFiber | null;
  [key: string]: unknown;
};

interface ResolveInspectComponentsResultOptions {
  components: ReactComponentInfo[];
  idByFiber: Map<object, string>;
  targetMatchedIndex: number;
  nearest: { fiber: InspectFiber; sourceElement: Element | null };
  targetEl: Element | null;
  hostCache: Map<object, Element | null>;
  visiting: Set<object>;
  findPreferredSelectedFiber: (startFiber: InspectFiber) => InspectFiber | null;
  buildCssSelector: (el: Element | null) => string;
  getElementPath: (el: Element | null) => string;
}

interface InspectComponentsSelectionResult {
  selectedIndex: number;
  sourceElement: SourceElementSummary | null;
}

/** reactInspect 결과에서 selectedIndex/source 요약을 계산한다. */
function resolveInspectComponentsSelectionResult(
  options: ResolveInspectComponentsResultOptions,
): InspectComponentsSelectionResult {
  const preferredFiber = options.findPreferredSelectedFiber(options.nearest.fiber);
  const selectedIndex = resolveSelectedComponentIndex({
    components: options.components,
    idByFiber: options.idByFiber,
    preferredFiber,
    targetMatchedIndex: options.targetMatchedIndex,
    resolvePreferredFiberDomInfo() {
      return preferredFiber
        ? getDomInfoForFiber({
            fiber: preferredFiber,
            hostCache: options.hostCache,
            visiting: options.visiting,
            selectedEl: options.targetEl,
            buildCssSelector: options.buildCssSelector,
            getElementPath: options.getElementPath,
          })
        : null;
    },
  });

  return {
    selectedIndex,
    sourceElement: buildSourceElementSummary({
      sourceElement: options.nearest.sourceElement,
      buildCssSelector: options.buildCssSelector,
      getElementPath: options.getElementPath,
    }),
  };
}

export { resolveInspectComponentsSelectionResult };
export type { ResolveInspectComponentsResultOptions, InspectComponentsSelectionResult };
