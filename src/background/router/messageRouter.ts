import {
  ensureContentScript,
  ensureStartElementPicker,
  sendCallPageAgent,
} from './contentScriptBridge';
import { toErrorMessage } from '../errors/messageErrors';
import { relayRuntimeMessage } from '../relay/runtimeRelay';
import type { RuntimeMessage, RuntimeSendResponse } from './runtimeMessageTypes';

function hasValidTabId(tabId: number | undefined): tabId is number {
  return typeof tabId === 'number' && tabId >= 0;
}

function hasValidMethod(method: string | undefined): method is string {
  return typeof method === 'string' && !!method.trim();
}

function createBackgroundMessageListener() {
  return (
    message: RuntimeMessage,
    sender: chrome.runtime.MessageSender,
    sendResponse: RuntimeSendResponse,
  ): boolean => {
    if (message.action === 'startElementPicker') {
      if (!hasValidTabId(message.tabId)) {
        sendResponse({ ok: false, error: '유효한 탭 ID를 찾지 못했습니다.' });
        return false;
      }
      const tabId = message.tabId;

      (async () => {
        try {
          await ensureStartElementPicker(tabId);
          sendResponse({ ok: true });
        } catch (error) {
          sendResponse({ ok: false, error: toErrorMessage(error) });
        }
      })();
      return true;
    }

    if (message.action === 'callPageAgent') {
      if (!hasValidTabId(message.tabId)) {
        sendResponse({ ok: false, error: '유효한 탭 ID를 찾지 못했습니다.' });
        return false;
      }
      if (!hasValidMethod(message.method)) {
        sendResponse({ ok: false, error: '실행할 메서드 이름이 비어 있습니다.' });
        return false;
      }

      const { tabId, method, args } = message;
      (async () => {
        try {
          await ensureContentScript(tabId);
          const forwarded = await sendCallPageAgent(tabId, method, args);

          if (
            forwarded &&
            typeof forwarded === 'object' &&
            'ok' in forwarded &&
            (forwarded as { ok?: unknown }).ok === false
          ) {
            sendResponse({
              ok: false,
              error: String((forwarded as { error?: unknown }).error ?? '페이지 에이전트 호출 실패'),
            });
            return;
          }

          if (
            forwarded &&
            typeof forwarded === 'object' &&
            'ok' in forwarded &&
            (forwarded as { ok?: unknown }).ok === true &&
            'result' in forwarded
          ) {
            sendResponse({ ok: true, result: (forwarded as { result?: unknown }).result });
            return;
          }

          sendResponse({ ok: true, result: forwarded });
        } catch (error) {
          sendResponse({ ok: false, error: toErrorMessage(error) });
        }
      })();
      return true;
    }

    if (message.action === 'elementSelected' && message.elementInfo != null) {
      relayRuntimeMessage({
        action: 'elementSelected',
        tabId: sender.tab?.id,
        elementInfo: message.elementInfo,
      });
      sendResponse({ ok: true });
      return false;
    }

    if (message.action === 'elementPickerStopped') {
      relayRuntimeMessage({
        action: 'elementPickerStopped',
        tabId: sender.tab?.id,
        reason: message.reason,
      });
      sendResponse({ ok: true });
      return false;
    }

    if (message.action === 'pageRuntimeChanged') {
      relayRuntimeMessage({
        action: 'pageRuntimeChanged',
        tabId: sender.tab?.id,
      });
      sendResponse({ ok: true });
      return false;
    }

    return false;
  };
}

export { createBackgroundMessageListener };
