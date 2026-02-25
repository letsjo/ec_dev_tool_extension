import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createElementPickerBridge } from '../../src/content/elementPickerBridge';

const PAGE_AGENT_SCRIPT_ID = 'ec-dev-tool-page-agent-script';
const RUNTIME_HOOK_SCRIPT_ID = 'ec-dev-tool-react-runtime-hook-script';

function removeInjectedScripts() {
  document.getElementById(PAGE_AGENT_SCRIPT_ID)?.remove();
  document.getElementById(RUNTIME_HOOK_SCRIPT_ID)?.remove();
}

describe('elementPickerBridge', () => {
  const originalChrome = (globalThis as { chrome?: unknown }).chrome;

  beforeEach(() => {
    (globalThis as { chrome?: unknown }).chrome = {
      runtime: {
        getURL: vi.fn((path: string) => `chrome-extension://test/${path}`),
      },
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
    removeInjectedScripts();
    (globalThis as { chrome?: unknown }).chrome = originalChrome;
  });

  it('retries page-agent script injection after load failure', () => {
    const bridge = createElementPickerBridge();

    bridge.startRuntimeHookBridge();
    const firstScript = document.getElementById(PAGE_AGENT_SCRIPT_ID) as HTMLScriptElement | null;
    expect(firstScript).toBeTruthy();

    firstScript?.onerror?.(new Event('error'));
    expect(document.getElementById(PAGE_AGENT_SCRIPT_ID)).toBeNull();

    bridge.startRuntimeHookBridge();
    const secondScript = document.getElementById(PAGE_AGENT_SCRIPT_ID);
    expect(secondScript).toBeTruthy();
    expect(secondScript).not.toBe(firstScript);

    bridge.stopRuntimeHookBridge();
  });

  it('marks page-agent script as injected only after successful load', () => {
    const bridge = createElementPickerBridge();

    bridge.startRuntimeHookBridge();
    const firstScript = document.getElementById(PAGE_AGENT_SCRIPT_ID) as HTMLScriptElement | null;
    expect(firstScript).toBeTruthy();

    firstScript?.onload?.(new Event('load'));
    expect(document.getElementById(PAGE_AGENT_SCRIPT_ID)).toBeNull();

    bridge.startRuntimeHookBridge();
    expect(document.getElementById(PAGE_AGENT_SCRIPT_ID)).toBeNull();

    bridge.stopRuntimeHookBridge();
  });
});
