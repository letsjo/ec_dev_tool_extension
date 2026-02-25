export interface CallPageAgentResponse {
  ok: boolean;
  result?: unknown;
  error?: string;
}

export type PageAgentDoneHandler = (result: unknown | null, errorText?: string) => void;

/**
 * DevTools panel -> background -> pageAgent 브리지 호출 공통 래퍼.
 * 응답/오류 형식을 한 곳에서 표준화해 UI 오케스트레이션 코드의 분기를 단순화한다.
 */
export function callInspectedPageAgent(
  method: string,
  args: unknown,
  onDone: PageAgentDoneHandler,
) {
  const tabId = chrome.devtools.inspectedWindow.tabId;
  chrome.runtime.sendMessage(
    {
      action: 'callPageAgent',
      tabId,
      method,
      args,
    },
    (response?: CallPageAgentResponse) => {
      if (chrome.runtime.lastError) {
        onDone(null, chrome.runtime.lastError.message ?? '페이지 에이전트 호출 실패');
        return;
      }
      if (!response || response.ok !== true) {
        onDone(null, response?.error ?? '페이지 에이전트 호출 실패');
        return;
      }
      onDone('result' in response ? (response.result ?? null) : null);
    },
  );
}
