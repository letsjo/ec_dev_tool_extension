import { describe, expect, it, vi } from 'vitest';
import {
  createDebugPageAgentCaller,
  createDebugPaneSetters,
} from '../../src/features/panel/controller/wiring/controllerWiringDebug';
import type { CallInspectedPageAgent } from '../../src/features/panel/bridge/pageAgentClient';

describe('controllerWiringDebug', () => {
  it('wraps pageAgent calls with request/response debug logs', () => {
    const appendDebugLog = vi.fn();
    const callInspectedPageAgent: CallInspectedPageAgent = vi.fn((method, _args, onDone) => {
      if (method === 'ping') {
        onDone({ ok: true, payload: [1, 2, 3] }, undefined);
        return;
      }
      onDone(null, 'runtime failed');
    });
    const wrappedCall = createDebugPageAgentCaller({
      appendDebugLog,
      callInspectedPageAgent,
    });

    const firstDone = vi.fn();
    wrappedCall('ping', { long: 'x'.repeat(300), meta: { nested: true } }, firstDone);
    const secondDone = vi.fn();
    wrappedCall('reactInspect', ['a', 'b'], secondDone);

    expect(callInspectedPageAgent).toHaveBeenCalledTimes(2);
    expect(firstDone).toHaveBeenCalledWith({ ok: true, payload: [1, 2, 3] }, undefined);
    expect(secondDone).toHaveBeenCalledWith(null, 'runtime failed');

    expect(appendDebugLog).toHaveBeenNthCalledWith(
      1,
      'pageAgent.request',
      expect.objectContaining({ requestId: 1, method: 'ping' }),
    );
    expect(appendDebugLog).toHaveBeenNthCalledWith(
      2,
      'pageAgent.response',
      expect.objectContaining({ requestId: 1, method: 'ping', hasError: false }),
    );
    expect(appendDebugLog).toHaveBeenNthCalledWith(
      3,
      'pageAgent.request',
      expect.objectContaining({ requestId: 2, method: 'reactInspect' }),
    );
    expect(appendDebugLog).toHaveBeenNthCalledWith(
      4,
      'pageAgent.response',
      expect.objectContaining({ requestId: 2, method: 'reactInspect', hasError: true }),
    );
  });

  it('wraps pane setters with debug logs', () => {
    const appendDebugLog = vi.fn();
    const setOutput = vi.fn();
    const setElementOutput = vi.fn();
    const setReactStatus = vi.fn();
    const setDomTreeStatus = vi.fn();
    const setDomTreeEmpty = vi.fn();

    const {
      setOutputWithDebug,
      setElementOutputWithDebug,
      setReactStatusWithDebug,
      setDomTreeStatusWithDebug,
      setDomTreeEmptyWithDebug,
    } = createDebugPaneSetters({
      appendDebugLog,
      setOutput,
      setElementOutput,
      setReactStatus,
      setDomTreeStatus,
      setDomTreeEmpty,
    });

    setOutputWithDebug('output', true);
    setElementOutputWithDebug('element');
    setReactStatusWithDebug('react');
    setDomTreeStatusWithDebug('dom', true);
    setDomTreeEmptyWithDebug('empty');

    expect(setOutput).toHaveBeenCalledWith('output', true);
    expect(setElementOutput).toHaveBeenCalledWith('element');
    expect(setReactStatus).toHaveBeenCalledWith('react', undefined);
    expect(setDomTreeStatus).toHaveBeenCalledWith('dom', true);
    expect(setDomTreeEmpty).toHaveBeenCalledWith('empty');
    expect(appendDebugLog).toHaveBeenCalledTimes(5);
  });
});
