import { describe, expect, it, vi } from 'vitest';
import { bindRuntimeMessageListener } from '../../src/features/panel/lifecycle/runtimeMessageBinding';

describe('bindRuntimeMessageListener', () => {
  it('binds and unbinds the same runtime listener', () => {
    const addListener = vi.fn();
    const removeListener = vi.fn();
    const onRuntimeMessage = vi.fn();

    const unbind = bindRuntimeMessageListener(onRuntimeMessage, {
      addListener,
      removeListener,
    });

    expect(addListener).toHaveBeenCalledWith(onRuntimeMessage);

    unbind();
    expect(removeListener).toHaveBeenCalledWith(onRuntimeMessage);
  });
});
