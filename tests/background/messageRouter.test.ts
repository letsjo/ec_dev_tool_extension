import { afterEach, describe, expect, it, vi } from 'vitest';
import { createBackgroundMessageListener } from '../../src/background/messageRouter';

type AnyRecord = Record<string, any>;

function installChromeMock(overrides: Partial<AnyRecord> = {}) {
  const tabsSendMessage = vi.fn();
  const executeScript = vi.fn();
  const runtimeSendMessage = vi.fn().mockResolvedValue(undefined);

  const chromeMock = {
    tabs: {
      sendMessage: tabsSendMessage,
    },
    scripting: {
      executeScript,
    },
    runtime: {
      sendMessage: runtimeSendMessage,
      onMessage: {
        addListener: vi.fn(),
      },
    },
    ...overrides,
  };

  (globalThis as AnyRecord).chrome = chromeMock;
  return {
    chromeMock,
    tabsSendMessage,
    executeScript,
    runtimeSendMessage,
  };
}

async function runListener(
  listener: ReturnType<typeof createBackgroundMessageListener>,
  message: AnyRecord,
  sender: AnyRecord = { tab: { id: 7 } },
) {
  let resolveResponse: ((value: AnyRecord) => void) | null = null;
  const responsePromise = new Promise<AnyRecord>((resolve) => {
    resolveResponse = resolve;
  });

  const listenerReturn = listener(message, sender, (response) => {
    if (resolveResponse) {
      resolveResponse(response as AnyRecord);
    }
  });

  if (!listenerReturn) {
    return {
      listenerReturn,
      response: await responsePromise,
    };
  }

  return {
    listenerReturn,
    response: await responsePromise,
  };
}

afterEach(() => {
  delete (globalThis as AnyRecord).chrome;
});

describe('background messageRouter', () => {
  it('returns tab validation error for startElementPicker', async () => {
    installChromeMock();
    const listener = createBackgroundMessageListener();

    const result = await runListener(listener, {
      action: 'startElementPicker',
      tabId: -1,
    });

    expect(result.listenerReturn).toBe(false);
    expect(result.response).toEqual({
      ok: false,
      error: '유효한 탭 ID를 찾지 못했습니다.',
    });
  });

  it('forwards callPageAgent success payload', async () => {
    const { tabsSendMessage } = installChromeMock();
    tabsSendMessage.mockImplementation((_tabId: number, payload: AnyRecord) => {
      if (payload.action === 'pingContentScript') {
        return Promise.resolve({ ok: true });
      }
      if (payload.action === 'callPageAgent') {
        return Promise.resolve({ ok: true, result: { hello: 'world' } });
      }
      return Promise.resolve({ ok: true });
    });

    const listener = createBackgroundMessageListener();
    const result = await runListener(listener, {
      action: 'callPageAgent',
      tabId: 3,
      method: 'reactInspect',
      args: { lightweight: true },
    });

    expect(result.listenerReturn).toBe(true);
    expect(result.response).toEqual({
      ok: true,
      result: { hello: 'world' },
    });
  });

  it('normalizes forwarded callPageAgent error payload', async () => {
    const { tabsSendMessage } = installChromeMock();
    tabsSendMessage.mockImplementation((_tabId: number, payload: AnyRecord) => {
      if (payload.action === 'pingContentScript') {
        return Promise.resolve({ ok: true });
      }
      if (payload.action === 'callPageAgent') {
        return Promise.resolve({ ok: false, error: 'hook failed' });
      }
      return Promise.resolve({ ok: true });
    });

    const listener = createBackgroundMessageListener();
    const result = await runListener(listener, {
      action: 'callPageAgent',
      tabId: 3,
      method: 'reactInspectPath',
      args: { section: 'hooks' },
    });

    expect(result.listenerReturn).toBe(true);
    expect(result.response).toEqual({
      ok: false,
      error: 'hook failed',
    });
  });

  it('relays elementSelected runtime event to panel listeners', async () => {
    const { runtimeSendMessage } = installChromeMock();
    const listener = createBackgroundMessageListener();

    const result = await runListener(
      listener,
      {
        action: 'elementSelected',
        elementInfo: { selector: '#root' },
      },
      { tab: { id: 44 } },
    );

    expect(result.listenerReturn).toBe(false);
    expect(result.response).toEqual({ ok: true });
    expect(runtimeSendMessage).toHaveBeenCalledWith({
      action: 'elementSelected',
      tabId: 44,
      elementInfo: { selector: '#root' },
    });
  });
});
