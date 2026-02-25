import type {
  ComponentFilterResult,
  ReactComponentInfo,
} from '../../../shared/inspector/types';

interface ResolveNextSelectionParams {
  reactComponents: ReactComponentInfo[];
  filterResult: ComponentFilterResult;
  previousSelectedId: string | null;
  requestedSelectedIndex: number | undefined;
}

interface NextSelectionResult {
  selectedIndex: number;
  selectedChanged: boolean;
}

/** 선택 보존 옵션에 따라 이전 선택 컴포넌트 id를 추출한다. */
export function resolvePreviousSelectedId(
  preserveSelection: boolean,
  reactComponents: ReactComponentInfo[],
  selectedIndex: number,
): string | null {
  if (!preserveSelection) return null;
  if (selectedIndex < 0 || selectedIndex >= reactComponents.length) return null;
  return reactComponents[selectedIndex].id;
}

/**
 * reactInspect 결과와 필터 결과를 조합해 다음 선택 인덱스를 계산한다.
 * - requested index를 기본으로 사용
 * - previousSelectedId가 존재하면 해당 id의 새 인덱스를 우선 보존
 * - 필터에 의해 가려진 경우 첫 matched, 없으면 첫 visible로 보정
 * - visible이 없으면 null 반환
 */
export function resolveNextSelection(
  params: ResolveNextSelectionParams,
): NextSelectionResult | null {
  const {
    reactComponents,
    filterResult,
    previousSelectedId,
    requestedSelectedIndex,
  } = params;

  if (filterResult.visibleIndices.length === 0) {
    return null;
  }

  let preferredIndex = typeof requestedSelectedIndex === 'number' ? requestedSelectedIndex : 0;
  if (previousSelectedId) {
    const preservedIndex = reactComponents.findIndex(
      (component) => component.id === previousSelectedId,
    );
    if (preservedIndex >= 0) {
      preferredIndex = preservedIndex;
    }
  }

  const baseIndex =
    preferredIndex >= 0 && preferredIndex < reactComponents.length ? preferredIndex : 0;
  const selectedIndex = filterResult.visibleIndices.includes(baseIndex)
    ? baseIndex
    : (filterResult.matchedIndices[0] ?? filterResult.visibleIndices[0]);
  const selectedChanged = previousSelectedId !== (reactComponents[selectedIndex]?.id ?? null);

  return {
    selectedIndex,
    selectedChanged,
  };
}
