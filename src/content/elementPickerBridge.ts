import { notifyRuntimeChanged } from "./runtimeMessaging";

const RUNTIME_HOOK_SCRIPT_ID = "ec-dev-tool-react-runtime-hook-script";
const PAGE_AGENT_SCRIPT_ID = "ec-dev-tool-page-agent-script";
const RUNTIME_HOOK_MESSAGE_SOURCE = "EC_DEV_TOOL_REACT_RUNTIME_HOOK";
const RUNTIME_HOOK_MESSAGE_ACTION = "reactCommit";
const PAGE_AGENT_MESSAGE_SOURCE = "EC_DEV_TOOL_PAGE_AGENT_BRIDGE";
const PAGE_AGENT_MESSAGE_ACTION_REQUEST = "request";
const PAGE_AGENT_MESSAGE_ACTION_RESPONSE = "response";
const PAGE_AGENT_CALL_TIMEOUT_MS = 20000;

const RUNTIME_CHANGE_DEBOUNCE_MS = 300;
const RUNTIME_CHANGE_MIN_NOTIFY_MS = 1000;

interface PendingPageAgentRequest {
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
  timeoutId: number;
}

interface ElementPickerBridge {
  startRuntimeHookBridge: () => void;
  stopRuntimeHookBridge: () => void;
  callPageAgent: (method: string, args?: unknown) => Promise<unknown>;
}

/** content script에서 runtime/pageAgent 브리지 메시지와 스크립트 주입 상태를 관리한다. */
function createElementPickerBridge(): ElementPickerBridge {
  let runtimeChangeTimer: number | null = null;
  let runtimeLastNotifiedAt = 0;
  let runtimeMessageHandler: ((event: MessageEvent) => void) | null = null;
  let pageAgentMessageHandler: ((event: MessageEvent) => void) | null = null;
  let pageAgentRequestSeq = 0;
  let pageAgentScriptInjected = false;
  const pendingPageAgentRequests = new Map<string, PendingPageAgentRequest>();

  function scheduleRuntimeChanged() {
    if (runtimeChangeTimer !== null) return;
    const elapsed = Date.now() - runtimeLastNotifiedAt;
    const throttleWait = elapsed >= RUNTIME_CHANGE_MIN_NOTIFY_MS
      ? 0
      : (RUNTIME_CHANGE_MIN_NOTIFY_MS - elapsed);
    const waitMs = Math.max(RUNTIME_CHANGE_DEBOUNCE_MS, throttleWait);

    runtimeChangeTimer = window.setTimeout(() => {
      runtimeChangeTimer = null;
      runtimeLastNotifiedAt = Date.now();
      notifyRuntimeChanged();
    }, waitMs);
  }

  function injectRuntimeHookScript() {
    if (document.getElementById(RUNTIME_HOOK_SCRIPT_ID)) return;
    const mountTarget = document.documentElement || document.head || document.body;
    if (!mountTarget) {
      window.setTimeout(() => {
        injectRuntimeHookScript();
      }, 0);
      return;
    }

    const script = document.createElement("script");
    script.id = RUNTIME_HOOK_SCRIPT_ID;
    script.src = chrome.runtime.getURL("dist/reactRuntimeHook.global.js");
    script.async = false;
    script.onload = () => {
      if (script.parentNode) script.parentNode.removeChild(script);
    };
    script.onerror = () => {
      if (script.parentNode) script.parentNode.removeChild(script);
    };

    mountTarget.appendChild(script);
  }

  function injectPageAgentScript() {
    if (pageAgentScriptInjected || document.getElementById(PAGE_AGENT_SCRIPT_ID)) return;
    const mountTarget = document.documentElement || document.head || document.body;
    if (!mountTarget) {
      window.setTimeout(() => {
        injectPageAgentScript();
      }, 0);
      return;
    }

    const script = document.createElement("script");
    script.id = PAGE_AGENT_SCRIPT_ID;
    script.src = chrome.runtime.getURL("dist/pageAgent.global.js");
    script.async = false;
    script.onload = () => {
      if (script.parentNode) script.parentNode.removeChild(script);
    };
    script.onerror = () => {
      if (script.parentNode) script.parentNode.removeChild(script);
    };

    pageAgentScriptInjected = true;
    mountTarget.appendChild(script);
  }

  function onRuntimeHookMessage(event: MessageEvent) {
    if (event.source !== window) return;
    const data = event.data;
    if (!data || typeof data !== "object") return;

    const source = (data as { source?: unknown }).source;
    const action = (data as { action?: unknown }).action;
    if (source !== RUNTIME_HOOK_MESSAGE_SOURCE) return;
    if (action !== RUNTIME_HOOK_MESSAGE_ACTION) return;

    scheduleRuntimeChanged();
  }

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
      const errorText = String((data as { error?: unknown }).error ?? "페이지 에이전트 호출에 실패했습니다.");
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
    injectPageAgentScript();
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
        "*"
      );
    });
  }

  function startRuntimeHookBridge() {
    if (!runtimeMessageHandler) {
      runtimeMessageHandler = (event: MessageEvent) => {
        onRuntimeHookMessage(event);
      };
      window.addEventListener("message", runtimeMessageHandler);
    }
    injectRuntimeHookScript();
    injectPageAgentScript();
  }

  function stopRuntimeHookBridge() {
    if (runtimeMessageHandler) {
      window.removeEventListener("message", runtimeMessageHandler);
      runtimeMessageHandler = null;
    }
    if (runtimeChangeTimer !== null) {
      window.clearTimeout(runtimeChangeTimer);
      runtimeChangeTimer = null;
    }
    stopPageAgentBridgeListener();
  }

  return {
    startRuntimeHookBridge,
    stopRuntimeHookBridge,
    callPageAgent,
  };
}

export { createElementPickerBridge };
