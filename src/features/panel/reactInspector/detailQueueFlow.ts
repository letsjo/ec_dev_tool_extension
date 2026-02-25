import type { CallInspectedPageAgent } from '../bridge/pageAgentClient';
import type {
  ReactComponentDetailResult,
  ReactComponentInfo,
} from '../../../shared/inspector/types';
import type { RuntimeRefreshLookup } from './lookup';
import {
  applySelectedComponentDetailResult as applySelectedComponentDetailResultValue,
} from './detailApply';
import {
  createReactDetailFetchQueue as createReactDetailFetchQueueValue,
} from './detailFetchQueue';

interface CreateReactDetailQueueFlowOptions {
  cooldownMs: number;
  callInspectedPageAgent: CallInspectedPageAgent;
  getLookup: () => RuntimeRefreshLookup;
  getReactComponents: () => ReactComponentInfo[];
  setReactComponents: (nextComponents: ReactComponentInfo[]) => void;
  getSelectedReactComponentIndex: () => number;
  getComponentSearchTexts: () => string[];
  getComponentSearchIncludeDataTokens: () => boolean;
  patchComponentSearchTextCacheAt: (
    reactComponents: ReactComponentInfo[],
    componentSearchTexts: string[],
    index: number,
    includeDataTokens: boolean,
  ) => void;
  renderReactComponentDetail: (component: ReactComponentInfo) => void;
  setReactDetailEmpty: (text: string) => void;
}

interface CreateReactDetailQueueFlowDependencies {
  applySelectedComponentDetailResult: typeof applySelectedComponentDetailResultValue;
  createReactDetailFetchQueue: typeof createReactDetailFetchQueueValue;
}

const DETAIL_QUEUE_FLOW_DEFAULT_DEPS: CreateReactDetailQueueFlowDependencies = {
  applySelectedComponentDetailResult: applySelectedComponentDetailResultValue,
  createReactDetailFetchQueue: createReactDetailFetchQueueValue,
};

/** 상세 응답 병합과 detail fetch queue 결선을 한 번에 구성한다. */
export function createReactDetailQueueFlow(
  options: CreateReactDetailQueueFlowOptions,
  deps: CreateReactDetailQueueFlowDependencies = DETAIL_QUEUE_FLOW_DEFAULT_DEPS,
) {
  /** 상세 응답(props/hooks)을 현재 목록 상태에 병합하고 필요 시 상세 패널을 다시 그린다. */
  function applySelectedComponentDetail(result: ReactComponentDetailResult): boolean {
    const appliedResult = deps.applySelectedComponentDetailResult({
      result,
      reactComponents: options.getReactComponents(),
      componentSearchTexts: options.getComponentSearchTexts(),
      componentSearchIncludeDataTokens: options.getComponentSearchIncludeDataTokens(),
      selectedReactComponentIndex: options.getSelectedReactComponentIndex(),
      patchComponentSearchTextCacheAt: options.patchComponentSearchTextCacheAt,
      renderReactComponentDetail: options.renderReactComponentDetail,
    });
    options.setReactComponents(appliedResult.reactComponents);
    return appliedResult.applied;
  }

  const detailFetchQueue = deps.createReactDetailFetchQueue({
    cooldownMs: options.cooldownMs,
    callInspectedPageAgent: options.callInspectedPageAgent,
    getLookup: options.getLookup,
    getSelectedComponent: () => {
      const selectedIndex = options.getSelectedReactComponentIndex();
      const components = options.getReactComponents();
      return selectedIndex >= 0 ? components[selectedIndex] : null;
    },
    findComponentById: (componentId) =>
      options.getReactComponents().find((candidate) => candidate.id === componentId),
    applySelectedComponentDetail,
    setReactDetailEmpty: options.setReactDetailEmpty,
  });

  return {
    detailFetchQueue,
  };
}
