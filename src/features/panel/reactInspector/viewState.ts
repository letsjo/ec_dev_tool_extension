export interface ReactInspectorPaneState {
  statusText: string;
  statusIsError?: boolean;
  listText: string;
  detailText: string;
}

interface ReactInspectorPaneSetters {
  setReactStatus: (text: string, isError?: boolean) => void;
  setReactListEmpty: (text: string) => void;
  setReactDetailEmpty: (text: string) => void;
}

/**
 * React Inspector 패널 3개(status/list/detail)의 empty 상태를
 * 동일한 규칙으로 적용한다.
 */
export function applyReactInspectorPaneState(
  setters: ReactInspectorPaneSetters,
  state: ReactInspectorPaneState,
) {
  setters.setReactStatus(state.statusText, state.statusIsError === true);
  setters.setReactListEmpty(state.listText);
  setters.setReactDetailEmpty(state.detailText);
}

/** React Inspector를 기본 placeholder 상태로 초기화할 때 사용할 상태를 생성한다. */
export function buildReactInspectorResetPaneState(
  statusText: string,
  isError = false,
): ReactInspectorPaneState {
  return {
    statusText,
    statusIsError: isError,
    listText: '컴포넌트 목록이 여기에 표시됩니다.',
    detailText: '컴포넌트를 선택하면 props/hooks를 표시합니다.',
  };
}

/** React Inspector 조회 시작 시(로딩) 사용할 상태를 생성한다. */
export function buildReactInspectorLoadingPaneState(): ReactInspectorPaneState {
  return {
    statusText: 'React 정보 조회 중…',
    listText: '컴포넌트 트리 조회 중…',
    detailText: '조회 중…',
  };
}

/** 목록 패널에서 empty 상태 문구를 생성한다. */
export function buildReactComponentListEmptyText(
  totalCount: number,
  componentSearchQuery: string,
): string {
  if (totalCount <= 0) {
    return '컴포넌트 목록이 없습니다.';
  }
  const normalizedQuery = componentSearchQuery.trim();
  const suffix = normalizedQuery ? `: "${normalizedQuery}"` : '';
  return `검색 결과가 없습니다${suffix}`;
}
