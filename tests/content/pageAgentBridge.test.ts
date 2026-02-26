import { afterEach, describe, expect, it, vi } from 'vitest';
import { installPageAgentBridge } from '../../src/content/pageAgentBridge';

describe('pageAgentBridge', () => {
  const postMessageSpy = vi.spyOn(window, 'postMessage');

  afterEach(() => {
    postMessageSpy.mockReset();
  });

  it('executes method and posts success response for valid bridge request', () => {
    const executeMethod = vi.fn(() => ({ ok: true }));
    const removeListener = installPageAgentBridge({
      bridgeSource: 'TEST_BRIDGE',
      requestAction: 'request',
      responseAction: 'response',
      executeMethod,
    });

    window.dispatchEvent(
      new MessageEvent('message', {
        source: window,
        data: {
          source: 'TEST_BRIDGE',
          action: 'request',
          requestId: 'req-1',
          method: 'ping',
          args: { value: 1 },
        },
      }),
    );

    expect(executeMethod).toHaveBeenCalledWith('ping', { value: 1 });
    expect(postMessageSpy).toHaveBeenCalledWith(
      {
        source: 'TEST_BRIDGE',
        action: 'response',
        requestId: 'req-1',
        ok: true,
        result: { ok: true },
      },
      '*',
    );

    removeListener();
  });

  it('posts error response when execute method throws', () => {
    const executeMethod = vi.fn(() => {
      throw new Error('bridge failed');
    });
    const removeListener = installPageAgentBridge({
      bridgeSource: 'TEST_BRIDGE',
      requestAction: 'request',
      responseAction: 'response',
      executeMethod,
    });

    window.dispatchEvent(
      new MessageEvent('message', {
        source: window,
        data: {
          source: 'TEST_BRIDGE',
          action: 'request',
          requestId: 'req-2',
          method: 'reactInspect',
          args: null,
        },
      }),
    );

    expect(postMessageSpy).toHaveBeenCalledWith(
      {
        source: 'TEST_BRIDGE',
        action: 'response',
        requestId: 'req-2',
        ok: false,
        error: 'bridge failed',
      },
      '*',
    );

    removeListener();
  });
});
