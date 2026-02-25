import type { ReactComponentInfo } from '../../../shared/inspector/types';
import { restoreCollapsedById } from './search';

export interface ReactInspectApplyOptions {
  preserveSelection?: boolean;
  preserveCollapsed?: boolean;
  highlightSelection?: boolean;
  scrollSelectionIntoView?: boolean;
  expandSelectionAncestors?: boolean;
  lightweight?: boolean;
  trackUpdates?: boolean;
  refreshDetail?: boolean;
  statusText?: string;
}

export interface NormalizedReactInspectApplyOptions {
  preserveSelection: boolean;
  preserveCollapsed: boolean;
  highlightSelection: boolean;
  scrollSelectionIntoView: boolean;
  expandSelectionAncestors: boolean;
  lightweight: boolean;
  trackUpdates: boolean;
  refreshDetail: boolean;
  statusText?: string;
}

/** apply 옵션의 기본값 규칙을 단일 함수로 정규화한다. */
export function normalizeReactInspectApplyOptions(
  options: ReactInspectApplyOptions,
): NormalizedReactInspectApplyOptions {
  return {
    preserveSelection: options.preserveSelection === true,
    preserveCollapsed: options.preserveCollapsed === true,
    highlightSelection: options.highlightSelection !== false,
    scrollSelectionIntoView: options.scrollSelectionIntoView !== false,
    expandSelectionAncestors: options.expandSelectionAncestors !== false,
    lightweight: options.lightweight === true,
    trackUpdates: options.trackUpdates === true,
    refreshDetail: options.refreshDetail !== false,
    statusText: options.statusText,
  };
}

/** preserve 옵션 기준으로 접힘 상태를 복원하거나 초기화한다. */
export function resolveCollapsedComponentIds(
  reactComponents: ReactComponentInfo[],
  preserveCollapsed: boolean,
  previousCollapsedIds: ReadonlySet<string>,
): Set<string> {
  if (!preserveCollapsed) {
    return new Set<string>();
  }
  return restoreCollapsedById(reactComponents, previousCollapsedIds);
}

/** 상태 문구가 없으면 기본 성공 문구를 생성한다. */
export function buildReactInspectSuccessStatusText(
  componentCount: number,
  statusText?: string,
): string {
  if (typeof statusText === 'string' && statusText) {
    return statusText;
  }
  return `컴포넌트 ${componentCount}개를 찾았습니다. 항목을 클릭하면 페이지 DOM과 함께 확인됩니다.`;
}

/** 상세 갱신을 생략하고 리스트만 다시 그릴 수 있는지 판별한다. */
export function shouldRenderListOnlyAfterApply(
  refreshDetail: boolean,
  selectedChanged: boolean,
): boolean {
  return !refreshDetail && !selectedChanged;
}
