import type { ComponentFilterResult } from '../../../../shared/inspector';

export type SearchNoResultContext = 'searchInput' | 'inspectResult';

interface SearchNoResultUiText {
  detailText: string;
  reactStatusText: string;
  domStatusText: string;
  domEmptyText: string;
}

/**
 * 검색 결과 없음 상태에서 사용할 UI 문구를 생성한다.
 * context를 나눠 사용자 액션(검색 입력 vs inspect 결과 적용)에 맞는 상태 문구를 유지한다.
 */
export function buildSearchNoResultUiText(
  totalCount: number,
  context: SearchNoResultContext,
): SearchNoResultUiText {
  const safeTotal = Math.max(0, totalCount);
  return {
    detailText: '검색 결과가 없습니다.',
    reactStatusText:
      context === 'searchInput'
        ? `검색 결과가 없습니다. (총 ${safeTotal}개)`
        : `컴포넌트 ${safeTotal}개를 찾았지만 검색 결과가 없습니다.`,
    domStatusText: '검색 조건과 일치하는 컴포넌트가 없습니다.',
    domEmptyText: '표시할 DOM이 없습니다.',
  };
}

/** 검색 결과 요약 상태 문구를 생성한다. */
export function buildSearchSummaryStatusText(
  filterResult: ComponentFilterResult,
  totalCount: number,
): string {
  const safeTotal = Math.max(0, totalCount);
  return `검색 매치 ${filterResult.matchedIndices.length}개 / 표시 ${filterResult.visibleIndices.length}개 / 전체 ${safeTotal}개`;
}
