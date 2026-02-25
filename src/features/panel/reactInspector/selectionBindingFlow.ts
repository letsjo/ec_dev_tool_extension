import type { ReactComponentInfo } from '../../../shared/inspector/types';
import {
  createReactComponentSelector as createReactComponentSelectorValue,
} from './selection';

interface DetailFetchQueueLike {
  request: (component: ReactComponentInfo) => void;
  getLastFailedAt: (componentId: string) => number | undefined;
}

interface CreateReactComponentSelectionBindingFlowOptions {
  getReactComponents: () => ReactComponentInfo[];
  setSelectedComponentIndex: (index: number) => void;
  clearPageHoverPreview: () => void;
  expandAncestorPaths: (indices: number[]) => void;
  renderReactComponentList: () => void;
  getReactComponentListEl: () => HTMLDivElement;
  getSelectedReactComponentIndex: () => number;
  renderReactComponentDetail: (component: ReactComponentInfo) => void;
  setReactDetailEmpty: (text: string) => void;
  highlightPageDomForComponent: (component: ReactComponentInfo) => void;
  detailFetchQueue: DetailFetchQueueLike;
  detailFetchRetryCooldownMs: number;
}

interface SelectionBindingFlowDependencies {
  requestAnimationFrameFn: (callback: FrameRequestCallback) => number;
  createReactComponentSelector: typeof createReactComponentSelectorValue;
}

const SELECTION_BINDING_FLOW_DEFAULT_DEPS: SelectionBindingFlowDependencies = {
  requestAnimationFrameFn: requestAnimationFrame.bind(window),
  createReactComponentSelector: createReactComponentSelectorValue,
};

/** 선택 인덱스에 해당하는 트리 item을 view 안으로 스크롤한다. */
function scrollSelectedComponentIntoView(
  reactComponentListEl: HTMLDivElement,
  selectedReactComponentIndex: number,
) {
  if (selectedReactComponentIndex < 0) return;
  const selector = `.react-component-item[data-component-index="${selectedReactComponentIndex}"]`;
  const activeItem = reactComponentListEl.querySelector<HTMLElement>(selector);
  if (!activeItem) return;
  activeItem.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}

/** React component selector 생성에 필요한 scroll/raf 결선을 포함해 핸들러를 구성한다. */
export function createReactComponentSelectionBindingFlow(
  options: CreateReactComponentSelectionBindingFlowOptions,
  deps: SelectionBindingFlowDependencies = SELECTION_BINDING_FLOW_DEFAULT_DEPS,
) {
  const scheduleScrollSelectedComponentIntoView = () => {
    deps.requestAnimationFrameFn(() => {
      scrollSelectedComponentIntoView(
        options.getReactComponentListEl(),
        options.getSelectedReactComponentIndex(),
      );
    });
  };

  const selectReactComponent = deps.createReactComponentSelector({
    getReactComponents: options.getReactComponents,
    setSelectedComponentIndex: options.setSelectedComponentIndex,
    clearPageHoverPreview: options.clearPageHoverPreview,
    expandAncestorPaths: options.expandAncestorPaths,
    renderReactComponentList: options.renderReactComponentList,
    scheduleScrollSelectedComponentIntoView,
    renderReactComponentDetail: options.renderReactComponentDetail,
    setReactDetailEmpty: options.setReactDetailEmpty,
    highlightPageDomForComponent: options.highlightPageDomForComponent,
    detailFetchQueue: options.detailFetchQueue,
    detailFetchRetryCooldownMs: options.detailFetchRetryCooldownMs,
  });

  return {
    selectReactComponent,
  };
}
