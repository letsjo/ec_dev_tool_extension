const PAGE_AGENT_MESSAGE_SOURCE = "EC_DEV_TOOL_PAGE_AGENT_BRIDGE";
const PAGE_AGENT_MESSAGE_ACTION_REQUEST = "request";
const PAGE_AGENT_MESSAGE_ACTION_RESPONSE = "response";
const PAGE_AGENT_CALL_TIMEOUT_MS = 20000;

interface PendingPageAgentRequest {
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
  timeoutId: number;
}

interface CreateElementPickerPageAgentClientOptions {
  injectPageAgentScript: () => void;
}

interface ElementPickerPageAgentClient {
  ensurePageAgentBridgeListener: () => void;
  stopPageAgentBridgeListener: () => void;
  callPageAgent: (method: string, args?: unknown) => Promise<unknown>;
}

/** pageAgent 브리지 요청/응답 listener와 pending request 상태를 관리한다. */
function createElementPickerPageAgentClient(
  options: CreateElementPickerPageAgentClientOptions,
): ElementPickerPageAgentClient {
  let pageAgentMessageHandler: ((event: MessageEvent) => void) | null = null;
  let pageAgentRequestSeq = 0;
  const pendingPageAgentRequests = new Map<string, PendingPageAgentRequest>();

  function onPageAgentMessage(event: MessageEvent) {
    if (event.source !== window) return;
    const data = event.data;
    if (!data || typeof data !== "object") return;

    const source = (data as { source?: unknown }).source;
    const action = (data as { action?: unknown }).action;
    const requestId = (data as { requestId?: unknown }).requestId;
    if (source !== PAGE_AGENT_MESSAGE_SOURCE) return;
    if (action !== PAGE_AGENT_MESSAGE_ACTION_RESPONSE) return;
    if (typeof requestId !== "string" || !requestId) return;

    const pending = pendingPageAgentRequests.get(requestId);
    if (!pending) return;
    pendingPageAgentRequests.delete(requestId);
    window.clearTimeout(pending.timeoutId);

    const ok = (data as { ok?: unknown }).ok === true;
    if (!ok) {
      const errorText = String(
        (data as { error?: unknown }).error ?? "페이지 에이전트 호출에 실패했습니다.",
      );
      pending.reject(new Error(errorText));
      return;
    }
    pending.resolve((data as { result?: unknown }).result);
  }

  function ensurePageAgentBridgeListener() {
    if (pageAgentMessageHandler) return;
    pageAgentMessageHandler = (event: MessageEvent) => {
      onPageAgentMessage(event);
    };
    window.addEventListener("message", pageAgentMessageHandler);
  }

  function stopPageAgentBridgeListener() {
    if (pageAgentMessageHandler) {
      window.removeEventListener("message", pageAgentMessageHandler);
      pageAgentMessageHandler = null;
    }

    pendingPageAgentRequests.forEach((pending) => {
      window.clearTimeout(pending.timeoutId);
      pending.reject(new Error("페이지 에이전트 호출이 취소되었습니다."));
    });
    pendingPageAgentRequests.clear();
  }

  function callPageAgent(method: string, args?: unknown): Promise<unknown> {
    options.injectPageAgentScript();
    ensurePageAgentBridgeListener();
    const requestId = `ec-page-agent-${Date.now()}-${pageAgentRequestSeq++}`;
    return new Promise<unknown>((resolve, reject) => {
      const timeoutId = window.setTimeout(() => {
        pendingPageAgentRequests.delete(requestId);
        reject(new Error("페이지 에이전트 응답 시간이 초과되었습니다."));
      }, PAGE_AGENT_CALL_TIMEOUT_MS);

      pendingPageAgentRequests.set(requestId, {
        resolve,
        reject,
        timeoutId,
      });

      window.postMessage(
        {
          source: PAGE_AGENT_MESSAGE_SOURCE,
          action: PAGE_AGENT_MESSAGE_ACTION_REQUEST,
          requestId,
          method,
          args: args ?? null,
        },
        "*",
      );
    });
  }

  return {
    ensurePageAgentBridgeListener,
    stopPageAgentBridgeListener,
    callPageAgent,
  };
}

export { createElementPickerPageAgentClient };
