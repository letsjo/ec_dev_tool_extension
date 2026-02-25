/**
 * 패널의 텍스트/상태 클래스 적용 규칙을 통일한다.
 * - 텍스트가 비면 `.empty`를 부여한다.
 * - 오류 상태는 `.error` 클래스로만 제어한다.
 */
export function setPaneText(element: HTMLElement, text: string) {
  element.textContent = text;
  element.classList.toggle('empty', !text);
}

/** 텍스트와 오류 상태를 함께 갱신한다. */
export function setPaneTextWithErrorState(
  element: HTMLElement,
  text: string,
  isError: boolean,
) {
  setPaneText(element, text);
  element.classList.toggle('error', isError);
}

/**
 * React 리스트/상세처럼 empty placeholder를 signature와 함께 유지하는 패널에 사용한다.
 * signature는 호출자가 마지막 렌더 캐시 키로 보관한다.
 */
export function setPaneEmptyState(element: HTMLElement, text: string): string {
  const signature = `__empty__:${text}`;
  element.textContent = text;
  element.classList.add('empty');
  return signature;
}

/** DOM 자식 노드를 비운다. */
export function clearPaneContent(element: HTMLElement) {
  element.innerHTML = '';
}
