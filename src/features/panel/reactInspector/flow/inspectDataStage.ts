import type {
  ReactComponentInfo,
  ReactInspectResult,
} from '../../../../shared/inspector';
import { resolveCollapsedComponentIds as resolveCollapsedComponentIdsValue } from './applyFlow';
import { buildReactInspectResultModel as buildReactInspectResultModelValue } from '../resultModel';
import {
  buildComponentSearchTexts as buildComponentSearchTextsValue,
  snapshotCollapsedIds as snapshotCollapsedIdsValue,
} from '../search';
import { resolvePreviousSelectedId as resolvePreviousSelectedIdValue } from '../selection/selectionModel';

interface ResolveReactInspectDataStageOptions {
  result: ReactInspectResult;
  preserveSelection: boolean;
  preserveCollapsed: boolean;
  lightweight: boolean;
  trackUpdates: boolean;
  reactComponents: ReactComponentInfo[];
  selectedReactComponentIndex: number;
  collapsedComponentIds: Set<string>;
}

interface ResolvedReactInspectDataStage {
  previousSelectedId: string | null;
  reactComponents: ReactComponentInfo[];
  updatedComponentIds: Set<string>;
  componentSearchIncludeDataTokens: boolean;
  componentSearchTexts: string[];
  collapsedComponentIds: Set<string>;
}

/**
 * reactInspect 결과 반영의 data stage를 순수 계산으로 분리한다.
 * controller는 반환값을 상태에 할당만 하고 렌더/선택 단계로 넘긴다.
 */
export function resolveReactInspectDataStage(
  options: ResolveReactInspectDataStageOptions,
): ResolvedReactInspectDataStage {
  const previousSelectedId = resolvePreviousSelectedIdValue(
    options.preserveSelection,
    options.reactComponents,
    options.selectedReactComponentIndex,
  );
  const previousCollapsedIds = options.preserveCollapsed
    ? snapshotCollapsedIdsValue(options.reactComponents, options.collapsedComponentIds)
    : new Set<string>();

  const resultModel = buildReactInspectResultModelValue({
    previousComponents: options.reactComponents,
    incomingComponents: Array.isArray(options.result.components)
      ? options.result.components
      : [],
    lightweight: options.lightweight,
    trackUpdates: options.trackUpdates,
  });
  const nextReactComponents = resultModel.reactComponents;
  const componentSearchIncludeDataTokens =
    resultModel.componentSearchIncludeDataTokens;
  const componentSearchTexts = buildComponentSearchTextsValue(
    nextReactComponents,
    componentSearchIncludeDataTokens,
  );

  const collapsedComponentIds = resolveCollapsedComponentIdsValue(
    nextReactComponents,
    options.preserveCollapsed,
    previousCollapsedIds,
  );

  return {
    previousSelectedId,
    reactComponents: nextReactComponents,
    updatedComponentIds: resultModel.updatedComponentIds,
    componentSearchIncludeDataTokens,
    componentSearchTexts,
    collapsedComponentIds,
  };
}
