import { describe, expect, it, vi } from 'vitest';
import { createPanelDebugLogFlow } from '../../src/features/panel/debugLog/debugLogFlow';

describe('debugLogFlow', () => {
  it('appends logs to pane text and keeps placeholder state in sync', () => {
    const debugLogPaneEl = document.createElement('div');
    debugLogPaneEl.className = 'empty';
    const debugLogCopyBtnEl = document.createElement('button');
    const debugLogClearBtnEl = document.createElement('button');
    const onLogAppended = vi.fn();

    const flow = createPanelDebugLogFlow({
      getDebugLogPaneEl: () => debugLogPaneEl,
      getDebugLogCopyBtnEl: () => debugLogCopyBtnEl,
      getDebugLogClearBtnEl: () => debugLogClearBtnEl,
      now: () => new Date('2026-02-27T00:00:00.000Z'),
      onLogAppended,
    });

    flow.appendDebugLog('test.event', { ok: true });

    expect(debugLogPaneEl.classList.contains('empty')).toBe(false);
    expect(debugLogPaneEl.textContent).toContain('test.event');
    expect(debugLogPaneEl.textContent).toContain('"ok":true');
    expect(flow.getDebugLogText()).toContain('test.event');
    expect(onLogAppended).toHaveBeenCalledWith('test.event', { ok: true });
  });

  it('drops oldest log lines when maxEntries is exceeded', () => {
    const debugLogPaneEl = document.createElement('div');
    const debugLogCopyBtnEl = document.createElement('button');
    const debugLogClearBtnEl = document.createElement('button');

    const flow = createPanelDebugLogFlow({
      getDebugLogPaneEl: () => debugLogPaneEl,
      getDebugLogCopyBtnEl: () => debugLogCopyBtnEl,
      getDebugLogClearBtnEl: () => debugLogClearBtnEl,
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
    const debugLogClearBtnEl = document.createElement('button');
    const copyText = vi.fn(async () => {});

    const flow = createPanelDebugLogFlow({
      getDebugLogPaneEl: () => debugLogPaneEl,
      getDebugLogCopyBtnEl: () => debugLogCopyBtnEl,
      getDebugLogClearBtnEl: () => debugLogClearBtnEl,
      copyText,
      now: () => new Date('2026-02-27T00:00:00.000Z'),
    });

    flow.appendDebugLog('copy.target', { value: 1 });
    debugLogCopyBtnEl.click();
    await Promise.resolve();

    expect(copyText).toHaveBeenCalledTimes(1);
    expect(copyText).toHaveBeenCalledWith(expect.stringContaining('copy.target'));
  });

  it('clears accumulated logs when clear button is clicked', () => {
    const debugLogPaneEl = document.createElement('div');
    debugLogPaneEl.className = 'empty';
    const debugLogCopyBtnEl = document.createElement('button');
    const debugLogClearBtnEl = document.createElement('button');

    const flow = createPanelDebugLogFlow({
      getDebugLogPaneEl: () => debugLogPaneEl,
      getDebugLogCopyBtnEl: () => debugLogCopyBtnEl,
      getDebugLogClearBtnEl: () => debugLogClearBtnEl,
      now: () => new Date('2026-02-27T00:00:00.000Z'),
    });

    flow.appendDebugLog('clear.target', { value: 1 });
    expect(debugLogPaneEl.textContent).toContain('clear.target');
    expect(debugLogPaneEl.classList.contains('empty')).toBe(false);

    debugLogClearBtnEl.click();

    expect(flow.getDebugLogText()).toBe('');
    expect(debugLogPaneEl.textContent).toContain('디버그 로그가 여기에 누적됩니다.');
    expect(debugLogPaneEl.classList.contains('empty')).toBe(true);
  });

  it('marks error level for failure events and error payloads', () => {
    const debugLogPaneEl = document.createElement('div');
    const debugLogCopyBtnEl = document.createElement('button');
    const debugLogClearBtnEl = document.createElement('button');

    const flow = createPanelDebugLogFlow({
      getDebugLogPaneEl: () => debugLogPaneEl,
      getDebugLogCopyBtnEl: () => debugLogCopyBtnEl,
      getDebugLogClearBtnEl: () => debugLogClearBtnEl,
      now: () => new Date('2026-02-27T00:00:00.000Z'),
    });

    flow.appendDebugLog('pageAgent.response', { hasError: true, errorText: 'timeout' });
    flow.appendDebugLog('debugLog.copy.failure', { error: 'denied' });

    const text = flow.getDebugLogText();
    expect(text).toContain('[ERROR] pageAgent.response');
    expect(text).toContain('[ERROR] debugLog.copy.failure');
  });
});
