const DETAIL_FETCH_STALE_SELECTION_MESSAGE =
  '선택 컴포넌트를 갱신하지 못했습니다. 다시 선택해 주세요.';

/** 상세 조회 실패 reason을 상세 pane 표시 문구로 변환한다. */
function buildDetailFetchFailureText(reason: string) {
  return `상세 정보 조회 실패: ${reason}`;
}

export {
  buildDetailFetchFailureText,
  DETAIL_FETCH_STALE_SELECTION_MESSAGE,
};
