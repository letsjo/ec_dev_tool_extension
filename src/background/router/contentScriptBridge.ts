import { isMissingReceiverError, toErrorMessage } from '../errors/messageErrors';

/** 메시지를 전달 */
async function sendStartElementPicker(tabId: number): Promise<void> {
  await chrome.tabs.sendMessage(tabId, { action: 'startElementPicker' });
}

/** 메시지를 전달 */
async function sendCallPageAgent(tabId: number, method: string, args?: unknown): Promise<unknown> {
  return chrome.tabs.sendMessage(tabId, { action: 'callPageAgent', method, args });
}

/** content script를 재주입해 tab 메시지를 1회 재시도한다. */
async function retryAfterContentScriptInjection<T>(
  tabId: number,
  send: () => Promise<T>,
): Promise<T> {
  await chrome.scripting.executeScript({
    target: { tabId },
    files: ['dist/content.global.js'],
  });
  return send();
}

/** 필수 상태를 보장 */
async function ensureContentScript(tabId: number): Promise<void> {
  try {
    await chrome.tabs.sendMessage(tabId, { action: 'pingContentScript' });
    return;
  } catch (error) {
    const firstErrorMessage = toErrorMessage(error);
    if (!isMissingReceiverError(firstErrorMessage)) {
      throw error;
    }
  }

  await chrome.scripting.executeScript({
    target: { tabId },
    files: ['dist/content.global.js'],
  });
}

/**
 * content script가 사라진 타이밍(navigation/reload)에도 picker 시작 요청을 복구한다.
 * - ensure 단계에서 ping 복구
 * - startElementPicker 단계에서 missing receiver면 1회 재주입 후 재시도
 */
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

  await retryAfterContentScriptInjection(tabId, () => sendStartElementPicker(tabId));
}

export {
  ensureContentScript,
  ensureStartElementPicker,
  sendCallPageAgent,
};
