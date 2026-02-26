import type {
  ComponentFilterResult,
  ReactComponentInfo,
} from '../../../shared/inspector';

interface HandleSearchNoResultOptions {
  clearHoverPreview?: boolean;
}

interface HandleComponentSearchInputOptions {
  componentSearchQuery: string;
  reactComponents: ReactComponentInfo[];
  selectedReactComponentIndex: number;
  getComponentFilterResult: () => ComponentFilterResult;
  applySearchNoResultState: (options?: HandleSearchNoResultOptions) => void;
  expandAncestorPaths: (matchIndices: number[]) => void;
  selectReactComponent: (index: number) => void;
  renderReactComponentList: () => void;
  setReactStatus: (text: string, isError?: boolean) => void;
  buildSearchSummaryStatusText: (
    filterResult: ComponentFilterResult,
    totalCount: number,
  ) => string;
}

/**
 * 검색 입력 시 React 목록/선택/상태 문구를 일관 규칙으로 갱신한다.
 * - 결과 없음 처리
 * - 조상 자동 확장
 * - 현재 선택이 필터에서 사라진 경우 대체 선택
 */
export function handleComponentSearchInput(options: HandleComponentSearchInputOptions) {
  if (options.reactComponents.length === 0) {
    options.renderReactComponentList();
    return;
  }

  const filterResult = options.getComponentFilterResult();
  if (filterResult.visibleIndices.length === 0) {
    options.applySearchNoResultState({ clearHoverPreview: true });
    return;
  }

  if (options.componentSearchQuery.trim()) {
    options.expandAncestorPaths(filterResult.matchedIndices);
  }

  if (!filterResult.visibleIndices.includes(options.selectedReactComponentIndex)) {
    const nextIndex = filterResult.matchedIndices[0] ?? filterResult.visibleIndices[0];
    options.selectReactComponent(nextIndex);
    return;
  }

  options.renderReactComponentList();
  options.setReactStatus(
    options.buildSearchSummaryStatusText(filterResult, options.reactComponents.length),
  );
}
