import { describe, expect, it, vi } from 'vitest';
import { createPanelDebugLogFlow } from '../../src/features/panel/debugLog/debugLogFlow';

describe('debugLogFlow', () => {
  it('appends logs to pane text and keeps placeholder state in sync', () => {
    const debugLogPaneEl = document.createElement('div');
    debugLogPaneEl.className = 'empty';
    const debugLogCopyBtnEl = document.createElement('button');

    const flow = createPanelDebugLogFlow({
      getDebugLogPaneEl: () => debugLogPaneEl,
      getDebugLogCopyBtnEl: () => debugLogCopyBtnEl,
      now: () => new Date('2026-02-27T00:00:00.000Z'),
    });

    flow.appendDebugLog('test.event', { ok: true });

    expect(debugLogPaneEl.classList.contains('empty')).toBe(false);
    expect(debugLogPaneEl.textContent).toContain('test.event');
    expect(debugLogPaneEl.textContent).toContain('"ok":true');
    expect(flow.getDebugLogText()).toContain('test.event');
  });

  it('drops oldest log lines when maxEntries is exceeded', () => {
    const debugLogPaneEl = document.createElement('div');
    const debugLogCopyBtnEl = document.createElement('button');

    const flow = createPanelDebugLogFlow({
      getDebugLogPaneEl: () => debugLogPaneEl,
      getDebugLogCopyBtnEl: () => debugLogCopyBtnEl,
      maxEntries: 2,
      now: () => new Date('2026-02-27T00:00:00.000Z'),
    });

    flow.appendDebugLog('event.1');
    flow.appendDebugLog('event.2');
    flow.appendDebugLog('event.3');

    const text = flow.getDebugLogText();
    expect(text).not.toContain('event.1');
    expect(text).toContain('event.2');
    expect(text).toContain('event.3');
  });

  it('copies accumulated logs when copy button is clicked', async () => {
    const debugLogPaneEl = document.createElement('div');
    const debugLogCopyBtnEl = document.createElement('button');
    const copyText = vi.fn(async () => {});

    const flow = createPanelDebugLogFlow({
      getDebugLogPaneEl: () => debugLogPaneEl,
      getDebugLogCopyBtnEl: () => debugLogCopyBtnEl,
      copyText,
      now: () => new Date('2026-02-27T00:00:00.000Z'),
    });

    flow.appendDebugLog('copy.target', { value: 1 });
    debugLogCopyBtnEl.click();
    await Promise.resolve();

    expect(copyText).toHaveBeenCalledTimes(1);
    expect(copyText).toHaveBeenCalledWith(expect.stringContaining('copy.target'));
  });
});
