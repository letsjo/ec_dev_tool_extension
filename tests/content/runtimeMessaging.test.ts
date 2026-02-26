import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  notifyPickerStopped,
  notifyRuntimeChanged,
  sendRuntimeMessageSafe,
} from '../../src/content/runtimeMessaging';

type ChromeRuntimeMock = {
  runtime: {
    sendMessage: ReturnType<typeof vi.fn>;
  };
};

function setChromeMock(sendMessage: ReturnType<typeof vi.fn>) {
  (globalThis as { chrome?: unknown }).chrome = {
    runtime: {
      sendMessage,
    },
  } as ChromeRuntimeMock;
}

describe('runtimeMessaging', () => {
  afterEach(() => {
    delete (globalThis as { chrome?: unknown }).chrome;
    vi.restoreAllMocks();
  });

  it('swallows sendMessage sync errors', () => {
    const sendMessage = vi.fn(() => {
      throw new Error('runtime unavailable');
    });
    setChromeMock(sendMessage);

    expect(() => sendRuntimeMessageSafe({ action: 'test' })).not.toThrow();
  });

  it('attaches catch handler when sendMessage returns promise-like value', () => {
    const catchSpy = vi.fn();
    const sendMessage = vi.fn(() => ({
      catch: catchSpy,
    }));
    setChromeMock(sendMessage);

    sendRuntimeMessageSafe({ action: 'ping' });
    expect(catchSpy).toHaveBeenCalledTimes(1);
    expect(typeof catchSpy.mock.calls[0]?.[0]).toBe('function');
  });

  it('sends picker/runtime notifications with expected payloads', () => {
    const sendMessage = vi.fn(() => undefined);
    setChromeMock(sendMessage);

    notifyPickerStopped('selected');
    notifyRuntimeChanged();

    expect(sendMessage).toHaveBeenNthCalledWith(1, {
      action: 'elementPickerStopped',
      reason: 'selected',
    });
    expect(sendMessage).toHaveBeenNthCalledWith(2, {
      action: 'pageRuntimeChanged',
    });
  });
});
