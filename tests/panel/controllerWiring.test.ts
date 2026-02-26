import { afterEach, describe, expect, it, vi } from 'vitest';
import { createPanelControllerWiring } from '../../src/features/panel/controller/wiring/controllerWiring';

describe('createPanelControllerWiring', () => {
  const originalChrome = (globalThis as { chrome?: unknown }).chrome;

  afterEach(() => {
    (globalThis as { chrome?: unknown }).chrome = originalChrome;
  });

  it('returns bootstrap handler', () => {
    (globalThis as { chrome: unknown }).chrome = {
      runtime: {
        onMessage: {
          addListener: vi.fn(),
          removeListener: vi.fn(),
        },
      },
      devtools: {
        inspectedWindow: { tabId: 1 },
        network: {
          onNavigated: {
            addListener: vi.fn(),
            removeListener: vi.fn(),
          },
        },
      },
    };

    const wiring = createPanelControllerWiring();
    expect(typeof wiring.bootstrapPanel).toBe('function');
  });
});
