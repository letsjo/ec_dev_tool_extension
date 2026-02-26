import { describe, expect, it } from 'vitest';
import { createPanelDebugDiagnosticsFlow } from '../../src/features/panel/debugLog/debugDiagnosticsFlow';

describe('debugDiagnosticsFlow', () => {
  it('keeps diagnostics pane hidden when dev diagnostics is disabled', () => {
    const diagnosticsPaneEl = document.createElement('div');
    diagnosticsPaneEl.hidden = false;

    const flow = createPanelDebugDiagnosticsFlow({
      getDebugDiagnosticsPaneEl: () => diagnosticsPaneEl,
      isEnabled: () => false,
    });

    expect(flow.isEnabled()).toBe(false);
    expect(diagnosticsPaneEl.hidden).toBe(true);

    flow.recordDebugEvent('pageAgent.request');
    expect(diagnosticsPaneEl.hidden).toBe(true);
  });

  it('renders event counters when diagnostics mode is enabled', () => {
    const diagnosticsPaneEl = document.createElement('div');
    const now = new Date('2026-02-27T00:00:00.000Z');

    const flow = createPanelDebugDiagnosticsFlow({
      getDebugDiagnosticsPaneEl: () => diagnosticsPaneEl,
      isEnabled: () => true,
      now: () => now,
    });

    expect(flow.isEnabled()).toBe(true);
    expect(diagnosticsPaneEl.hidden).toBe(false);
    expect(diagnosticsPaneEl.textContent).toContain('events.total: 0');

    flow.recordDebugEvent('pageAgent.request');
    flow.recordDebugEvent('pageAgent.response');
    flow.recordDebugEvent('pageAgent.request');

    expect(diagnosticsPaneEl.textContent).toContain('events.total: 3');
    expect(diagnosticsPaneEl.textContent).toContain('events.unique: 2');
    expect(diagnosticsPaneEl.textContent).toContain('events.last: pageAgent.request');
    expect(diagnosticsPaneEl.textContent).toContain('- pageAgent.request: 2');
  });
});
