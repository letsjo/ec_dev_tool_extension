/**
 * 페이지에 오버레이를 띄우고, 마우스 위치의 DOM 요소를 하이라이트 후 클릭 시 선택 정보를 전달.
 */
import {
  notifyPickerStopped,
  sendRuntimeMessageSafe,
} from "./runtimeMessaging";
import { getElementInfo } from "./elementSelectorInfo";
import { createElementPickerBridge } from "./elementPickerBridge";
import { createElementPickerOverlayController } from "./elementPickerOverlay";

const elementPickerBridge = createElementPickerBridge();
const elementPickerOverlay = createElementPickerOverlayController({
  notifyPickerStopped,
  sendElementSelected(clientX, clientY, target) {
    sendRuntimeMessageSafe({
      action: "elementSelected",
      elementInfo: getElementInfo(target, clientX, clientY),
    });
  },
});

chrome.runtime.onMessage.addListener((message: { action: string }, _sender, sendResponse) => {
  if (message.action === "pingContentScript") {
    sendResponse({ ok: true });
    return false;
  }
  if (message.action === "startElementPicker") {
    elementPickerOverlay.startPicking();
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
  elementPickerOverlay.stopPicking("cancelled");
  elementPickerBridge.stopRuntimeHookBridge();
});
