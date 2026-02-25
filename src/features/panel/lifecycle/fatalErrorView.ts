/**
 * 패널 부트스트랩 실패 시 body를 에러 뷰로 교체한다.
 * 기존 DOM을 비우고 단일 컨테이너에 원인 메시지를 표시한다.
 */
export function renderPanelFatalErrorView(
  error: unknown,
  doc: Document = document,
) {
  const message = error instanceof Error ? error.message : String(error);
  doc.body.innerHTML = '';

  const container = doc.createElement('div');
  container.style.padding = '12px';
  container.style.fontFamily = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
  container.style.whiteSpace = 'pre-wrap';
  container.style.color = '#ffd7d7';
  container.style.background = '#3a1f27';
  container.style.border = '1px solid #8d3b4a';
  container.style.borderRadius = '6px';
  container.textContent = `EC Dev Tool panel 초기화 실패\\n\\n${message}`;
  doc.body.appendChild(container);
}
