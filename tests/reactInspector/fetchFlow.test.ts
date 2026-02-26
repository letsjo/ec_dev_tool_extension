import { describe, expect, it, vi } from 'vitest';
import type { PageAgentDoneHandler } from '../../src/features/panel/bridge/pageAgentClient';
import { createReactInspectFetchFlow } from '../../src/features/panel/reactInspector/flow/fetchFlow';
import type { ReactComponentInfo } from '../../src/shared/inspector';

function createComponent(id: string): ReactComponentInfo {
  return {
    id,
    parentId: null,
    name: `Component-${id}`,
    kind: 'function',
    depth: 0,
    props: {},
    hooks: [],
    hookCount: 0,
    domSelector: null,
    domPath: null,
    domTagName: null,
  };
}

describe('createReactInspectFetchFlow', () => {
  it('applies only latest response when reactInspect requests overlap', () => {
    const callbacks: PageAgentDoneHandler[] = [];
    const callInspectedPageAgent = vi.fn(
      (_method: string, _args: unknown, onDone: PageAgentDoneHandler) => {
        callbacks.push(onDone);
      },
    );

    const clearPageHoverPreview = vi.fn();
    const clearPageComponentHighlight = vi.fn();
    const applyLoadingPaneState = vi.fn();
    const resetReactInspector = vi.fn();
    const applyReactInspectResult = vi.fn();
    const onDoneFirst = vi.fn();
    const onDoneSecond = vi.fn();

    const flow = createReactInspectFetchFlow({
      callInspectedPageAgent,
      getStoredLookup: () => null,
      setStoredLookup: vi.fn(),
      getReactComponents: () => [],
      getSelectedReactComponentIndex: () => -1,
      clearPageHoverPreview,
      clearPageComponentHighlight,
      applyLoadingPaneState,
      resetReactInspector,
      applyReactInspectResult,
    });

    flow.fetchReactInfo('#first', { x: 10, y: 20 }, { onDone: onDoneFirst });
    flow.fetchReactInfo('#second', { x: 30, y: 40 }, { onDone: onDoneSecond });
    expect(callbacks).toHaveLength(2);

    callbacks[0](null, 'stale-error');
    expect(onDoneFirst).toHaveBeenCalledTimes(1);
    expect(resetReactInspector).not.toHaveBeenCalled();
    expect(applyReactInspectResult).not.toHaveBeenCalled();

    const latestResult = {
      components: [createComponent('latest')],
      selectedIndex: 0,
    };
    callbacks[1](latestResult);

    expect(applyReactInspectResult).toHaveBeenCalledTimes(1);
    expect(applyReactInspectResult).toHaveBeenCalledWith(latestResult, expect.any(Object));
    expect(onDoneSecond).toHaveBeenCalledTimes(1);
    expect(clearPageHoverPreview).toHaveBeenCalledTimes(2);
    expect(clearPageComponentHighlight).toHaveBeenCalledTimes(2);
    expect(applyLoadingPaneState).toHaveBeenCalledTimes(2);
  });

  it('skips background refresh while foreground inspect is in-flight', () => {
    const callbacks: PageAgentDoneHandler[] = [];
    const callInspectedPageAgent = vi.fn(
      (_method: string, _args: unknown, onDone: PageAgentDoneHandler) => {
        callbacks.push(onDone);
      },
    );

    const applyReactInspectResult = vi.fn();
    const onDoneForeground = vi.fn();
    const onDoneBackground = vi.fn();

    const flow = createReactInspectFetchFlow({
      callInspectedPageAgent,
      getStoredLookup: () => null,
      setStoredLookup: vi.fn(),
      getReactComponents: () => [],
      getSelectedReactComponentIndex: () => -1,
      clearPageHoverPreview: vi.fn(),
      clearPageComponentHighlight: vi.fn(),
      applyLoadingPaneState: vi.fn(),
      resetReactInspector: vi.fn(),
      applyReactInspectResult,
    });

    flow.fetchReactInfo('#foreground', { x: 1, y: 2 }, { onDone: onDoneForeground });
    flow.fetchReactInfo('#background', { x: 3, y: 4 }, { background: true, onDone: onDoneBackground });

    expect(callInspectedPageAgent).toHaveBeenCalledTimes(1);
    expect(onDoneBackground).toHaveBeenCalledTimes(1);
    expect(callbacks).toHaveLength(1);

    callbacks[0]({
      components: [createComponent('foreground')],
      selectedIndex: 0,
    });

    expect(onDoneForeground).toHaveBeenCalledTimes(1);
    expect(applyReactInspectResult).toHaveBeenCalledTimes(1);
  });
});
