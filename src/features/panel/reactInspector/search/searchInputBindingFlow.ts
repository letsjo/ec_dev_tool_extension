import type {
  ComponentFilterResult,
  ReactComponentInfo,
} from '../../../../shared/inspector';
import {
  handleComponentSearchInput as handleComponentSearchInputValue,
} from './searchInputFlow';
import type { SearchNoResultContext } from './searchStatus';

interface CreateReactComponentSearchInputFlowOptions {
  getSearchInputValue: () => string;
  setComponentSearchQuery: (query: string) => void;
  getComponentSearchQuery: () => string;
  getReactComponents: () => ReactComponentInfo[];
  getSelectedReactComponentIndex: () => number;
  getComponentFilterResult: () => ComponentFilterResult;
  applySearchNoResultState: (
    context: SearchNoResultContext,
    options?: { clearHoverPreview?: boolean },
  ) => void;
  expandAncestorPaths: (indices: number[]) => void;
  selectReactComponent: (index: number) => void;
  renderReactComponentList: () => void;
  setReactStatus: (text: string, isError?: boolean) => void;
  buildSearchSummaryStatusText: (
    filterResult: ComponentFilterResult,
    totalCount: number,
  ) => string;
}

interface SearchInputBindingFlowDependencies {
  handleComponentSearchInput: typeof handleComponentSearchInputValue;
}

const SEARCH_INPUT_BINDING_FLOW_DEFAULT_DEPS: SearchInputBindingFlowDependencies = {
  handleComponentSearchInput: handleComponentSearchInputValue,
};

/** 검색 input 값을 읽어 searchInputFlow에 필요한 상태/콜백을 결선한 핸들러를 구성한다. */
export function createReactComponentSearchInputFlow(
  options: CreateReactComponentSearchInputFlowOptions,
  deps: SearchInputBindingFlowDependencies = SEARCH_INPUT_BINDING_FLOW_DEFAULT_DEPS,
) {
  return function onComponentSearchInput() {
    const componentSearchQuery = options.getSearchInputValue();
    options.setComponentSearchQuery(componentSearchQuery);

    deps.handleComponentSearchInput({
      componentSearchQuery: options.getComponentSearchQuery(),
      reactComponents: options.getReactComponents(),
      selectedReactComponentIndex: options.getSelectedReactComponentIndex(),
      getComponentFilterResult: options.getComponentFilterResult,
      applySearchNoResultState: (bindingOptions) => {
        options.applySearchNoResultState('searchInput', bindingOptions);
      },
      expandAncestorPaths: options.expandAncestorPaths,
      selectReactComponent: options.selectReactComponent,
      renderReactComponentList: options.renderReactComponentList,
      setReactStatus: options.setReactStatus,
      buildSearchSummaryStatusText: options.buildSearchSummaryStatusText,
    });
  };
}
