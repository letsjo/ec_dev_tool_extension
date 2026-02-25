/**
 * 페이지에 오버레이를 띄우고, 마우스 위치의 DOM 요소를 하이라이트 후 클릭 시 선택 정보를 전달.
 */
import {
  notifyPickerStopped,
  sendRuntimeMessageSafe,
} from "./runtimeMessaging";
import { getElementInfo } from "./elementSelectorInfo";
import { createElementPickerBridge } from "./elementPickerBridge";

const OVERLAY_ID = "ec-dev-tool-element-picker-overlay";
const HIGHLIGHT_CLASS = "ec-dev-tool-picker-highlight";

let overlay: HTMLDivElement | null = null;
let lastHighlight: HTMLElement | null = null;
let onMoveHandler: ((e: MouseEvent) => void) | null = null;
let onClickHandler: ((e: MouseEvent) => void) | null = null;
let onKeyDownHandler: ((e: KeyboardEvent) => void) | null = null;

const elementPickerBridge = createElementPickerBridge();

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
    elementPickerBridge.callPageAgent(method, args)
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

elementPickerBridge.startRuntimeHookBridge();
window.addEventListener("beforeunload", () => {
  elementPickerBridge.stopRuntimeHookBridge();
});
