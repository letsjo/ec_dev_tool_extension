/**
 * 페이지에 오버레이를 띄우고, 마우스 위치의 DOM 요소를 하이라이트 후 클릭 시 선택 정보를 전달.
 */
import type { ElementInfo } from "../shared/inspector/types";

const OVERLAY_ID = "ec-dev-tool-element-picker-overlay";
const HIGHLIGHT_CLASS = "ec-dev-tool-picker-highlight";

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

let overlay: HTMLDivElement | null = null;
let lastHighlight: HTMLElement | null = null;
let onMoveHandler: ((e: MouseEvent) => void) | null = null;
let onClickHandler: ((e: MouseEvent) => void) | null = null;
let onKeyDownHandler: ((e: KeyboardEvent) => void) | null = null;

let runtimeChangeTimer: number | null = null;
let runtimeLastNotifiedAt = 0;
let runtimeMessageHandler: ((event: MessageEvent) => void) | null = null;
let pageAgentMessageHandler: ((event: MessageEvent) => void) | null = null;
let pageAgentRequestSeq = 0;
let pageAgentScriptInjected = false;

interface PendingPageAgentRequest {
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
  timeoutId: number;
}

const pendingPageAgentRequests = new Map<string, PendingPageAgentRequest>();

/** 메시지를 전달 */
function sendRuntimeMessageSafe(message: Record<string, unknown>) {
  try {
    const maybePromise: unknown = chrome.runtime.sendMessage(message);
    if (typeof maybePromise === "object" && maybePromise !== null && "catch" in maybePromise) {
      const maybeCatch = (maybePromise as { catch?: unknown }).catch;
      if (typeof maybeCatch === "function") {
        (maybePromise as Promise<unknown>).catch(() => {});
      }
    }
  } catch {
    // extension context unavailable or tab teardown race
  }
}

/** 상태 변화를 알림 */
function notifyPickerStopped(reason: "selected" | "cancelled") {
  sendRuntimeMessageSafe({
    action: "elementPickerStopped",
    reason,
  });
}

/** 상태 변화를 알림 */
function notifyRuntimeChanged() {
  sendRuntimeMessageSafe({
    action: "pageRuntimeChanged",
  });
}

/** 지연 실행을 예약 */
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

/** 해당 기능 흐름을 처리 */
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

/** 해당 기능 흐름을 처리 */
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

/** 이벤트를 처리 */
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

/** 이벤트를 처리 */
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

/** 필수 상태를 보장 */
function ensurePageAgentBridgeListener() {
  if (pageAgentMessageHandler) return;
  pageAgentMessageHandler = (event: MessageEvent) => {
    onPageAgentMessage(event);
  };
  window.addEventListener("message", pageAgentMessageHandler);
}

/** 동작을 중지 */
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

/** inspected page와 통신을 수행 */
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

/** 동작을 시작 */
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

/** 동작을 중지 */
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

/** 필요한 값/상태를 계산해 반환 */
function getElementPath(el: Element): string {
  const segments: string[] = [];
  let current: Element | null = el;
  while (current && current.nodeType === Node.ELEMENT_NODE) {
    let seg = (current as Element).tagName.toLowerCase();
    if (current.id) seg += `#${current.id}`;
    else if (current.className && typeof current.className === "string") {
      const classes = current.className.trim().split(/\s+/).filter(Boolean).slice(0, 2);
      if (classes.length) seg += "." + classes.join(".");
    }
    segments.unshift(seg);
    current = current.parentElement;
  }
  return segments.join(" > ");
}

/** 해당 기능 흐름을 처리 */
function escapeCssIdent(value: string): string {
  if (typeof CSS !== "undefined" && typeof CSS.escape === "function") return CSS.escape(value);
  return value.replace(/[^a-zA-Z0-9_-]/g, "\\$&");
}

/** 파생 데이터나 요약 값을 구성 */
function buildCssSelector(el: Element): string {
  if ((el as HTMLElement).id) {
    return `#${escapeCssIdent((el as HTMLElement).id)}`;
  }

  const segments: string[] = [];
  let current: Element | null = el;
  let guard = 0;
  while (current && current.nodeType === Node.ELEMENT_NODE && guard < 16) {
    const tag = current.tagName.toLowerCase();
    let segment = tag;

    const id = (current as HTMLElement).id;
    if (id) {
      segment += `#${escapeCssIdent(id)}`;
      segments.unshift(segment);
      break;
    }

    const parentEl: Element | null = current.parentElement;
    if (parentEl) {
      let sameTagCount = 0;
      let nth = 0;
      for (let i = 0; i < parentEl.children.length; i += 1) {
        const child = parentEl.children.item(i);
        if (!child) continue;
        if (child.tagName === current.tagName) {
          sameTagCount += 1;
          if (child === current) nth = sameTagCount;
        }
      }
      if (sameTagCount > 1 && nth > 0) {
        segment += `:nth-of-type(${nth})`;
      }
    }

    segments.unshift(segment);
    current = parentEl;
    guard += 1;
  }

  return segments.join(" > ");
}

/** 필요한 값/상태를 계산해 반환 */
function getSimpleSelector(el: Element): string {
  const selector = buildCssSelector(el);
  return selector || el.tagName.toLowerCase();
}

/** 필요한 값/상태를 계산해 반환 */
function getElementInfo(el: Element, clickX: number, clickY: number): ElementInfo {
  const rect = el.getBoundingClientRect();
  return {
    tagName: el.tagName.toLowerCase(),
    id: (el as HTMLElement).id || null,
    className: (el as HTMLElement).className || null,
    domPath: getElementPath(el),
    selector: getSimpleSelector(el),
    rect: { top: rect.top, left: rect.left, width: rect.width, height: rect.height },
    innerText: (el as HTMLElement).innerText?.slice(0, 200) ?? null,
    clickPoint: { x: clickX, y: clickY },
  };
}

/** 해당 기능 흐름을 처리 */
function highlight(el: HTMLElement | null) {
  if (lastHighlight === el) return;
  if (lastHighlight) {
    lastHighlight.classList.remove(HIGHLIGHT_CLASS);
    lastHighlight.style.outline = (lastHighlight as unknown as { _ecOutline?: string })._ecOutline ?? "";
    (lastHighlight as unknown as { _ecOutline?: string })._ecOutline = undefined;
  }
  lastHighlight = el ?? null;
  if (el) {
    const prev = el.style.outline;
    (el as unknown as { _ecOutline?: string })._ecOutline = prev;
    el.style.outline = "2px solid #1a73e8";
    el.classList.add(HIGHLIGHT_CLASS);
  }
}

/** 렌더링에 사용할 DOM/데이터 구조를 생성 */
function createOverlay(): HTMLDivElement {
  const div = document.createElement("div");
  div.id = OVERLAY_ID;
  div.style.cssText = [
    "position:fixed;inset:0;z-index:2147483647;cursor:crosshair;",
    "background:rgba(26,115,232,0.05);pointer-events:auto;",
  ].join(" ");
  return div;
}

/** 동작을 중지 */
function stopPicking(reason: "selected" | "cancelled" = "cancelled") {
  highlight(null);
  const hadOverlay = Boolean(overlay);
  if (overlay) {
    if (onMoveHandler) overlay.removeEventListener("mousemove", onMoveHandler);
    if (onClickHandler) overlay.removeEventListener("click", onClickHandler, true);
    if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
  }
  if (onKeyDownHandler) {
    document.removeEventListener("keydown", onKeyDownHandler);
  }
  overlay = null;
  lastHighlight = null;
  onMoveHandler = null;
  onClickHandler = null;
  onKeyDownHandler = null;

  if (hadOverlay) {
    notifyPickerStopped(reason);
  }
}

/** 동작을 시작 */
function startPicking() {
  if (overlay) return;
  overlay = createOverlay();
  document.documentElement.appendChild(overlay);

  const onMove = (e: MouseEvent) => {
    if (!overlay) return;
    overlay.style.pointerEvents = "none";
    const el = document.elementFromPoint(e.clientX, e.clientY);
    overlay.style.pointerEvents = "auto";
    const target = el && el !== overlay ? (el as HTMLElement) : null;
    highlight(target);
  };

  const onClick = (e: MouseEvent) => {
    if (!overlay) return;
    e.preventDefault();
    e.stopPropagation();
    overlay.style.pointerEvents = "none";
    const el = document.elementFromPoint(e.clientX, e.clientY);
    overlay.style.pointerEvents = "auto";
    if (el && el !== overlay) {
      sendRuntimeMessageSafe({
        action: "elementSelected",
        elementInfo: getElementInfo(el, e.clientX, e.clientY),
      });
    }
    stopPicking("selected");
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      stopPicking("cancelled");
    }
  };

  onMoveHandler = onMove;
  onClickHandler = onClick;
  onKeyDownHandler = onKeyDown;

  overlay.addEventListener("mousemove", onMoveHandler);
  overlay.addEventListener("click", onClickHandler, true);
  document.addEventListener("keydown", onKeyDownHandler);
}

chrome.runtime.onMessage.addListener((message: { action: string }, _sender, sendResponse) => {
  if (message.action === "pingContentScript") {
    sendResponse({ ok: true });
    return false;
  }
  if (message.action === "startElementPicker") {
    startPicking();
    sendResponse({ ok: true });
    return false;
  }
  if (message.action === "callPageAgent") {
    const method = (message as { method?: unknown }).method;
    const args = (message as { args?: unknown }).args;
    if (typeof method !== "string" || !method.trim()) {
      sendResponse({ ok: false, error: "실행할 메서드 이름이 비어 있습니다." });
      return false;
    }
    callPageAgent(method, args)
      .then((result) => {
        sendResponse({ ok: true, result });
      })
      .catch((error: unknown) => {
        const messageText = error instanceof Error ? error.message : String(error);
        sendResponse({ ok: false, error: messageText });
      });
    return true;
  }
  return false;
});

startRuntimeHookBridge();
window.addEventListener("beforeunload", () => {
  stopRuntimeHookBridge();
});
