import { describe, expect, it, vi } from 'vitest';
import type { PanelControllerContext } from '../../src/features/panel/controller/context';
import {
  createLifecycleReactFetchBindings,
  createPayloadModeToggleHandler,
} from '../../src/features/panel/controller/wiring/controllerWiringLifecycleRefresh';
import type {
  createElementSelectionFetchOptions as CreateElementSelectionFetchOptionsType,
  createRuntimeRefreshFetchOptions as CreateRuntimeRefreshFetchOptionsType,
} from '../../src/features/panel/reactInspector/fetchOptions';
import type { RuntimeRefreshScheduler } from '../../src/features/panel/runtimeRefresh/scheduler';

describe('controllerWiringLifecycleRefresh', () => {
  it('applies payload mode to runtime/selection fetch presets', () => {
    let payloadMode: 'lite' | 'full' = 'lite';
    const panelControllerContext = {
      getReactPayloadMode: vi.fn(() => payloadMode),
      setReactPayloadMode: vi.fn(),
    } as unknown as PanelControllerContext;
    const fetchReactInfo = vi.fn();
    const createRuntimeRefreshFetchOptions = vi.fn<CreateRuntimeRefreshFetchOptionsType>(
      (_background, _payloadMode, _onDone) => ({ background: true }),
    );
    const createElementSelectionFetchOptions = vi.fn<CreateElementSelectionFetchOptionsType>(
      (_payloadMode) => ({ lightweight: true }),
    );

    const { fetchReactInfoForRuntimeRefresh, fetchReactInfoForElementSelection } =
      createLifecycleReactFetchBindings({
        panelControllerContext,
        fetchReactInfo,
        createRuntimeRefreshFetchOptions,
        createElementSelectionFetchOptions,
      });

    const onDone = vi.fn();
    fetchReactInfoForRuntimeRefresh({ selector: '#root', pickPoint: { x: 10, y: 20 } }, true, onDone);
    expect(createRuntimeRefreshFetchOptions).toHaveBeenCalledWith(true, 'lite', onDone);
    expect(fetchReactInfo).toHaveBeenCalledWith('#root', { x: 10, y: 20 }, { background: true });

    payloadMode = 'full';
    fetchReactInfoForElementSelection('#app', { x: 1, y: 2 });
    expect(createElementSelectionFetchOptions).toHaveBeenCalledWith('full');
    expect(fetchReactInfo).toHaveBeenCalledWith('#app', { x: 1, y: 2 }, { lightweight: true });
  });

  it('toggles payload mode and triggers immediate refresh', () => {
    let payloadMode: 'lite' | 'full' = 'lite';
    const panelControllerContext = {
      getReactPayloadMode: vi.fn(() => payloadMode),
      setReactPayloadMode: vi.fn((mode: 'lite' | 'full') => {
        payloadMode = mode;
      }),
    } as unknown as PanelControllerContext;
    const runtimeRefreshScheduler: RuntimeRefreshScheduler = {
      schedule: vi.fn(),
      refresh: vi.fn(),
      reset: vi.fn(),
      dispose: vi.fn(),
    };
    const appendDebugLog = vi.fn();

    const onTogglePayloadMode = createPayloadModeToggleHandler({
      panelControllerContext,
      runtimeRefreshScheduler,
      appendDebugLog,
    });

    onTogglePayloadMode();
    expect(panelControllerContext.setReactPayloadMode).toHaveBeenCalledWith('full');
    expect(runtimeRefreshScheduler.refresh).toHaveBeenCalledWith(false);
    expect(appendDebugLog).toHaveBeenCalledWith('reactInspect.payloadMode.toggle', {
      mode: 'full',
    });
    expect(payloadMode).toBe('full');
  });
});
