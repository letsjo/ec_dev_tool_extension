import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ensureContentScript,
  ensureStartElementPicker,
  sendCallPageAgent,
} from '../../src/background/router/contentScriptBridge';

type AnyRecord = Record<string, any>;

function installChromeMock() {
  const tabsSendMessage = vi.fn();
  const executeScript = vi.fn().mockResolvedValue(undefined);

  (globalThis as AnyRecord).chrome = {
    tabs: {
      sendMessage: tabsSendMessage,
    },
    scripting: {
      executeScript,
    },
  };

  return { tabsSendMessage, executeScript };
}

afterEach(() => {
  delete (globalThis as AnyRecord).chrome;
});

describe('contentScriptBridge', () => {
  it('skips script injection when content script ping succeeds', async () => {
    const { tabsSendMessage, executeScript } = installChromeMock();
    tabsSendMessage.mockResolvedValue({ ok: true });

    await ensureContentScript(3);

    expect(tabsSendMessage).toHaveBeenCalledWith(3, { action: 'pingContentScript' });
    expect(executeScript).not.toHaveBeenCalled();
  });

  it('injects content script when ping reports missing receiver', async () => {
    const { tabsSendMessage, executeScript } = installChromeMock();
    tabsSendMessage.mockRejectedValueOnce(new Error('Receiving end does not exist.'));

    await ensureContentScript(9);

    expect(executeScript).toHaveBeenCalledTimes(1);
    expect(executeScript).toHaveBeenCalledWith({
      target: { tabId: 9 },
      files: ['dist/content.global.js'],
    });
  });

  it('retries startElementPicker after missing receiver during start action', async () => {
    const { tabsSendMessage, executeScript } = installChromeMock();
    const startPayload = { action: 'startElementPicker' };

    tabsSendMessage.mockImplementation(async (_tabId: number, payload: AnyRecord) => {
      if (payload.action === 'pingContentScript') return { ok: true };
      if (payload.action === 'startElementPicker') {
        const startCalls = tabsSendMessage.mock.calls.filter(
          ([, callPayload]) => callPayload?.action === 'startElementPicker',
        ).length;
        if (startCalls === 1) {
          throw new Error('Could not establish connection. Receiving end does not exist.');
        }
        return { ok: true };
      }
      return { ok: true };
    });

    await ensureStartElementPicker(11);

    const startCalls = tabsSendMessage.mock.calls.filter(
      ([tabId, payload]) => tabId === 11 && payload?.action === 'startElementPicker',
    );
    expect(startCalls).toHaveLength(2);
    expect(startCalls[0][1]).toEqual(startPayload);
    expect(startCalls[1][1]).toEqual(startPayload);
    expect(executeScript).toHaveBeenCalledTimes(1);
  });

  it('propagates non-recoverable startElementPicker errors', async () => {
    const { tabsSendMessage, executeScript } = installChromeMock();
    tabsSendMessage.mockImplementation(async (_tabId: number, payload: AnyRecord) => {
      if (payload.action === 'pingContentScript') return { ok: true };
      if (payload.action === 'startElementPicker') {
        throw new Error('picker blocked');
      }
      return { ok: true };
    });

    await expect(ensureStartElementPicker(13)).rejects.toThrow('picker blocked');
    expect(executeScript).not.toHaveBeenCalled();
  });

  it('forwards callPageAgent requests to tab messages', async () => {
    const { tabsSendMessage } = installChromeMock();
    tabsSendMessage.mockResolvedValue({ ok: true, result: { value: 1 } });

    const result = await sendCallPageAgent(15, 'reactInspect', { lightweight: true });

    expect(tabsSendMessage).toHaveBeenCalledWith(15, {
      action: 'callPageAgent',
      method: 'reactInspect',
      args: { lightweight: true },
    });
    expect(result).toEqual({ ok: true, result: { value: 1 } });
  });
});
