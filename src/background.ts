/**
 * 패널 ↔ 콘텐츠 스크립트 메시지 중계.
 * Select element 시 content script가 찍은 요소 정보를 패널로 전달.
 */
interface RuntimeMessage {
  action: string;
  tabId?: number;
  elementInfo?: unknown;
  reason?: string;
  method?: string;
  args?: unknown;
}

/** 표시/전달용 값으로 변환 */
function toErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

/** 조건 여부를 판별 */
function isMissingReceiverError(message: string): boolean {
  return /Receiving end does not exist|Could not establish connection/i.test(message);
}

/** 메시지를 전달 */
async function sendStartElementPicker(tabId: number): Promise<void> {
  await chrome.tabs.sendMessage(tabId, { action: "startElementPicker" });
}

/** 메시지를 전달 */
async function sendCallPageAgent(tabId: number, method: string, args?: unknown): Promise<unknown> {
  return chrome.tabs.sendMessage(tabId, { action: "callPageAgent", method, args });
}

/** 필수 상태를 보장 */
async function ensureContentScript(tabId: number): Promise<void> {
  try {
    await chrome.tabs.sendMessage(tabId, { action: "pingContentScript" });
    return;
  } catch (error) {
    const firstErrorMessage = toErrorMessage(error);
    if (!isMissingReceiverError(firstErrorMessage)) {
      throw error;
    }
  }

  await chrome.scripting.executeScript({
    target: { tabId },
    files: ["dist/content.global.js"],
  });
}

/** 필수 상태를 보장 */
async function ensureStartElementPicker(tabId: number): Promise<void> {
  await ensureContentScript(tabId);
  try {
    await sendStartElementPicker(tabId);
    return;
  } catch (error) {
    const firstErrorMessage = toErrorMessage(error);
    if (!isMissingReceiverError(firstErrorMessage)) {
      throw error;
    }
  }

  await chrome.scripting.executeScript({
    target: { tabId },
    files: ["dist/content.global.js"],
  });
  await sendStartElementPicker(tabId);
}

chrome.runtime.onMessage.addListener(
  (message: RuntimeMessage, sender, sendResponse: (response: Record<string, unknown>) => void) => {
    if (message.action === "startElementPicker") {
      if (typeof message.tabId !== "number" || message.tabId < 0) {
        sendResponse({ ok: false, error: "유효한 탭 ID를 찾지 못했습니다." });
        return false;
      }
      const tabId = message.tabId;
      (async () => {
        try {
          await ensureStartElementPicker(tabId);
          sendResponse({ ok: true });
        } catch (error) {
          sendResponse({
            ok: false,
            error: toErrorMessage(error),
          });
        }
      })();
      return true;
    }
    if (message.action === "callPageAgent") {
      if (typeof message.tabId !== "number" || message.tabId < 0) {
        sendResponse({ ok: false, error: "유효한 탭 ID를 찾지 못했습니다." });
        return false;
      }
      if (typeof message.method !== "string" || !message.method.trim()) {
        sendResponse({ ok: false, error: "실행할 메서드 이름이 비어 있습니다." });
        return false;
      }

      const tabId = message.tabId;
      const method = message.method;
      const args = message.args;
      (async () => {
        try {
          await ensureContentScript(tabId);
          const forwarded = await sendCallPageAgent(tabId, method, args);
          if (
            forwarded
            && typeof forwarded === "object"
            && "ok" in forwarded
            && (forwarded as { ok?: unknown }).ok === false
          ) {
            sendResponse({
              ok: false,
              error: String((forwarded as { error?: unknown }).error ?? "페이지 에이전트 호출 실패"),
            });
            return;
          }
          if (
            forwarded
            && typeof forwarded === "object"
            && "ok" in forwarded
            && (forwarded as { ok?: unknown }).ok === true
            && "result" in forwarded
          ) {
            sendResponse({ ok: true, result: (forwarded as { result?: unknown }).result });
            return;
          }
          sendResponse({ ok: true, result: forwarded });
        } catch (error) {
          sendResponse({
            ok: false,
            error: toErrorMessage(error),
          });
        }
      })();
      return true;
    }
    if (message.action === "elementSelected" && message.elementInfo != null) {
      chrome.runtime
        .sendMessage({
          action: "elementSelected",
          tabId: sender.tab?.id,
          elementInfo: message.elementInfo,
        })
        .catch(() => {});
      sendResponse({ ok: true });
      return false;
    }
    if (message.action === "elementPickerStopped") {
      chrome.runtime
        .sendMessage({
          action: "elementPickerStopped",
          tabId: sender.tab?.id,
          reason: message.reason,
        })
        .catch(() => {});
      sendResponse({ ok: true });
      return false;
    }
    if (message.action === "pageRuntimeChanged") {
      chrome.runtime
        .sendMessage({
          action: "pageRuntimeChanged",
          tabId: sender.tab?.id,
        })
        .catch(() => {});
      sendResponse({ ok: true });
      return false;
    }
    return false;
  }
);
