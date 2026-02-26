import { isMissingReceiverError, toErrorMessage } from './messageErrors';

/** 메시지를 전달 */
async function sendStartElementPicker(tabId: number): Promise<void> {
  await chrome.tabs.sendMessage(tabId, { action: 'startElementPicker' });
}

/** 메시지를 전달 */
async function sendCallPageAgent(tabId: number, method: string, args?: unknown): Promise<unknown> {
  return chrome.tabs.sendMessage(tabId, { action: 'callPageAgent', method, args });
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
    files: ['dist/content.global.js'],
  });
  await sendStartElementPicker(tabId);
}

export {
  ensureContentScript,
  ensureStartElementPicker,
  sendCallPageAgent,
};
