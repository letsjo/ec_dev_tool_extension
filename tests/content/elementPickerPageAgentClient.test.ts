import { afterEach, describe, expect, it, vi } from 'vitest';
import { createElementPickerPageAgentClient } from '../../src/content/elementPickerPageAgentClient';

describe('elementPickerPageAgentClient', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('posts pageAgent request and resolves on successful response', async () => {
    const injectPageAgentScript = vi.fn();
    const postMessageSpy = vi.spyOn(window, 'postMessage');
    const client = createElementPickerPageAgentClient({
      injectPageAgentScript,
    });

    const pending = client.callPageAgent('ping', { value: 1 });
    expect(injectPageAgentScript).toHaveBeenCalledTimes(1);
    expect(postMessageSpy).toHaveBeenCalledTimes(1);
    const requestPayload = postMessageSpy.mock.calls[0]?.[0] as {
      requestId: string;
      source: string;
    };
    expect(typeof requestPayload.requestId).toBe('string');
    expect(requestPayload.source).toBe('EC_DEV_TOOL_PAGE_AGENT_BRIDGE');

    window.dispatchEvent(
      new MessageEvent('message', {
        source: window,
        data: {
          source: 'EC_DEV_TOOL_PAGE_AGENT_BRIDGE',
          action: 'response',
          requestId: requestPayload.requestId,
          ok: true,
          result: { ok: 1 },
        },
      }),
    );

    await expect(pending).resolves.toEqual({ ok: 1 });
  });

  it('rejects on error response and on stop listener cancellation', async () => {
    const postMessageSpy = vi.spyOn(window, 'postMessage');
    const client = createElementPickerPageAgentClient({
      injectPageAgentScript: vi.fn(),
    });

    const firstPending = client.callPageAgent('first');
    const firstRequestId = (postMessageSpy.mock.calls[0]?.[0] as { requestId: string }).requestId;
    window.dispatchEvent(
      new MessageEvent('message', {
        source: window,
        data: {
          source: 'EC_DEV_TOOL_PAGE_AGENT_BRIDGE',
          action: 'response',
          requestId: firstRequestId,
          ok: false,
          error: 'broken',
        },
      }),
    );
    await expect(firstPending).rejects.toThrow('broken');

    const secondPending = client.callPageAgent('second');
    client.stopPageAgentBridgeListener();
    await expect(secondPending).rejects.toThrow('취소되었습니다');
  });
});
