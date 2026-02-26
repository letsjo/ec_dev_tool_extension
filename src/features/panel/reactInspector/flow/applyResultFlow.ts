import type {
  ComponentFilterResult,
  ReactComponentInfo,
  ReactInspectResult,
} from '../../../../shared/inspector';
import {
  buildReactInspectSuccessStatusText as buildReactInspectSuccessStatusTextValue,
  normalizeReactInspectApplyOptions as normalizeReactInspectApplyOptionsValue,
  shouldRenderListOnlyAfterApply as shouldRenderListOnlyAfterApplyValue,
  type ReactInspectApplyOptions,
} from '../applyFlow';
import { resolveReactInspectDataStage as resolveReactInspectDataStageValue } from './inspectDataStage';
import { resolveNextSelection as resolveNextSelectionValue } from '../selection/selectionModel';
import type { SearchNoResultContext } from '../search/searchStatus';

interface ReactInspectApplyStateSnapshot {
  reactComponents: ReactComponentInfo[];
  selectedReactComponentIndex: number;
  collapsedComponentIds: Set<string>;
}

interface ReactInspectApplyStateUpdate {
  reactComponents?: ReactComponentInfo[];
  selectedReactComponentIndex?: number;
  componentSearchIncludeDataTokens?: boolean;
  componentSearchTexts?: string[];
  collapsedComponentIds?: Set<string>;
  updatedComponentIds?: Set<string>;
}

interface CreateReactInspectResultApplyFlowOptions {
  readState: () => ReactInspectApplyStateSnapshot;
  writeState: (update: ReactInspectApplyStateUpdate) => void;
  getComponentFilterResult: () => ComponentFilterResult;
  setReactStatus: (text: string, isError?: boolean) => void;
  renderReactComponentList: () => void;
  selectReactComponent: (
    index: number,
    options: {
      highlightDom: boolean;
      scrollIntoView: boolean;
      expandAncestors: boolean;
    },
  ) => void;
  applySearchNoResultState: (context: SearchNoResultContext) => void;
  resetReactInspector: (statusText: string, isError?: boolean) => void;
}

/**
 * reactInspect 응답 반영 파이프라인을 조립한다.
 * 1) data stage 계산
 * 2) selection stage 계산
 * 3) render/selection stage 적용
 */
export function createReactInspectResultApplyFlow(
  options: CreateReactInspectResultApplyFlowOptions,
) {
  const {
    readState,
    writeState,
    getComponentFilterResult,
    setReactStatus,
    renderReactComponentList,
    selectReactComponent,
    applySearchNoResultState,
    resetReactInspector,
  } = options;

  return function applyReactInspectResult(
    result: ReactInspectResult,
    applyInput: ReactInspectApplyOptions = {},
  ) {
    const applyOptions = normalizeReactInspectApplyOptionsValue(applyInput);
    const state = readState();
    const dataStage = resolveReactInspectDataStageValue({
      result,
      preserveSelection: applyOptions.preserveSelection === true,
      preserveCollapsed: applyOptions.preserveCollapsed === true,
      lightweight: applyOptions.lightweight === true,
      trackUpdates: applyOptions.trackUpdates === true,
      reactComponents: state.reactComponents,
      selectedReactComponentIndex: state.selectedReactComponentIndex,
      collapsedComponentIds: state.collapsedComponentIds,
    });

    writeState({
      reactComponents: dataStage.reactComponents,
      updatedComponentIds: dataStage.updatedComponentIds,
      componentSearchIncludeDataTokens: dataStage.componentSearchIncludeDataTokens,
      componentSearchTexts: dataStage.componentSearchTexts,
      collapsedComponentIds: dataStage.collapsedComponentIds,
    });

    if (dataStage.reactComponents.length === 0) {
      resetReactInspector('React 컴포넌트를 찾지 못했습니다.', true);
      return;
    }

    const filterResult = getComponentFilterResult();
    const nextSelection = resolveNextSelectionValue({
      reactComponents: dataStage.reactComponents,
      filterResult,
      previousSelectedId: dataStage.previousSelectedId,
      requestedSelectedIndex:
        typeof result.selectedIndex === 'number' ? result.selectedIndex : undefined,
    });
    if (!nextSelection) {
      writeState({ selectedReactComponentIndex: -1 });
      applySearchNoResultState('inspectResult');
      return;
    }

    writeState({ selectedReactComponentIndex: nextSelection.selectedIndex });
    setReactStatus(
      buildReactInspectSuccessStatusTextValue(
        dataStage.reactComponents.length,
        applyOptions.statusText,
      ),
    );

    if (
      shouldRenderListOnlyAfterApplyValue(
        applyOptions.refreshDetail,
        nextSelection.selectedChanged,
      )
    ) {
      renderReactComponentList();
      return;
    }

    selectReactComponent(nextSelection.selectedIndex, {
      highlightDom: applyOptions.highlightSelection,
      scrollIntoView: applyOptions.scrollSelectionIntoView,
      expandAncestors: applyOptions.expandSelectionAncestors,
    });
  };
}
