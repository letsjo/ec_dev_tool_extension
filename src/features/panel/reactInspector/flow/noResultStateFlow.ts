import {
  buildSearchNoResultUiText as buildSearchNoResultUiTextValue,
  type SearchNoResultContext,
} from '../searchStatus';

interface CreateSearchNoResultStateFlowOptions {
  getTotalComponentCount: () => number;
  renderReactComponentList: () => void;
  setReactDetailEmpty: (text: string) => void;
  setReactStatus: (text: string, isError?: boolean) => void;
  clearPageHoverPreview: () => void;
  clearPageComponentHighlight: () => void;
  setDomTreeStatus: (text: string, isError?: boolean) => void;
  setDomTreeEmpty: (text: string) => void;
}

/** 검색 결과 없음 상태를 React/DOM pane에 일관되게 반영하는 핸들러를 구성한다. */
export function createSearchNoResultStateFlow(
  options: CreateSearchNoResultStateFlowOptions,
) {
  const {
    getTotalComponentCount,
    renderReactComponentList,
    setReactDetailEmpty,
    setReactStatus,
    clearPageHoverPreview,
    clearPageComponentHighlight,
    setDomTreeStatus,
    setDomTreeEmpty,
  } = options;

  return function applySearchNoResultState(
    context: SearchNoResultContext,
    args: { clearHoverPreview?: boolean } = {},
  ) {
    const uiText = buildSearchNoResultUiTextValue(getTotalComponentCount(), context);
    renderReactComponentList();
    setReactDetailEmpty(uiText.detailText);
    setReactStatus(uiText.reactStatusText, true);
    if (args.clearHoverPreview === true) {
      clearPageHoverPreview();
    }
    clearPageComponentHighlight();
    setDomTreeStatus(uiText.domStatusText, true);
    setDomTreeEmpty(uiText.domEmptyText);
  };
}
