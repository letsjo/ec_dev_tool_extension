import { notifyRuntimeChanged } from "./runtimeMessaging";
import { createElementPickerPageAgentClient } from "./elementPickerPageAgentClient";

const RUNTIME_HOOK_SCRIPT_ID = "ec-dev-tool-react-runtime-hook-script";
const PAGE_AGENT_SCRIPT_ID = "ec-dev-tool-page-agent-script";
const RUNTIME_HOOK_MESSAGE_SOURCE = "EC_DEV_TOOL_REACT_RUNTIME_HOOK";
const RUNTIME_HOOK_MESSAGE_ACTION = "reactCommit";

const RUNTIME_CHANGE_DEBOUNCE_MS = 300;
const RUNTIME_CHANGE_MIN_NOTIFY_MS = 1000;

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
  let pageAgentScriptInjected = false;

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
      // 성공적으로 로드된 이후에만 주입 완료 플래그를 고정한다.
      // 로드 실패 시 재시도 경로를 막지 않기 위함이다.
      pageAgentScriptInjected = true;
      if (script.parentNode) script.parentNode.removeChild(script);
    };
    script.onerror = () => {
      pageAgentScriptInjected = false;
      if (script.parentNode) script.parentNode.removeChild(script);
    };
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

  const pageAgentClient = createElementPickerPageAgentClient({
    injectPageAgentScript,
  });

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
    pageAgentClient.stopPageAgentBridgeListener();
  }

  return {
    startRuntimeHookBridge,
    stopRuntimeHookBridge,
    callPageAgent: pageAgentClient.callPageAgent,
  };
}

export { createElementPickerBridge };
