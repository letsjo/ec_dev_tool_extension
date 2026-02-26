import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  addInspectedPageNavigatedListener,
  getInspectedTabId,
  removeInspectedPageNavigatedListener,
} from '../../src/features/panel/devtoolsNetworkBridge';

type AnyRecord = Record<string, any>;

describe('devtoolsNetworkBridge', () => {
  afterEach(() => {
    delete (globalThis as AnyRecord).chrome;
  });

  it('reads inspected tab id from chrome.devtools', () => {
    (globalThis as AnyRecord).chrome = {
      devtools: {
        inspectedWindow: {
          tabId: 321,
        },
        network: {
          onNavigated: {
            addListener: vi.fn(),
            removeListener: vi.fn(),
          },
        },
      },
    };

    expect(getInspectedTabId()).toBe(321);
  });

  it('forwards add/remove listener calls to network.onNavigated', () => {
    const addListener = vi.fn();
    const removeListener = vi.fn();
    (globalThis as AnyRecord).chrome = {
      devtools: {
        inspectedWindow: {
          tabId: 1,
        },
        network: {
          onNavigated: {
            addListener,
            removeListener,
          },
        },
      },
    };

    const listener = vi.fn();
    addInspectedPageNavigatedListener(listener);
    removeInspectedPageNavigatedListener(listener);

    expect(addListener).toHaveBeenCalledWith(listener);
    expect(removeListener).toHaveBeenCalledWith(listener);
  });
});
