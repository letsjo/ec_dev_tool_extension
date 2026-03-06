import { describe, expect, it, vi } from 'vitest';
import { applyReactFetchRequestStage } from '../../src/features/panel/reactInspector/flow/fetchRequestStage';
import { applyReactFetchResponseStage } from '../../src/features/panel/reactInspector/flow/fetchResponseStage';

describe('reactInspector fetch stages', () => {
  it('applies request stage side effects and resolves selected component id', () => {
    const setStoredLookup = vi.fn();
    const clearPageHoverPreview = vi.fn();
    const clearPageComponentHighlight = vi.fn();
    const applyLoadingPaneState = vi.fn();

    const result = applyReactFetchRequestStage({
      selector: '#target',
      pickPoint: { x: 1, y: 2 },
      fetchOptions: {
        lightweight: true,
        serializeSelectedComponent: true,
      },
      getStoredLookup: () => null,
      setStoredLookup,
      getReactComponents: () => [
        {
          id: 'comp-1',
          parentId: null,
          name: 'Comp',
          kind: 'function',
          depth: 0,
          hooksCount: 0,
          domSelector: null,
          domPath: null,
          containsTarget: false,
          key: null,
          props: null,
          hooks: null,
        },
      ],
      getSelectedReactComponentIndex: () => 0,
      clearPageHoverPreview,
      clearPageComponentHighlight,
      applyLoadingPaneState,
    });

    expect(clearPageHoverPreview).toHaveBeenCalledTimes(1);
    expect(clearPageComponentHighlight).toHaveBeenCalledTimes(1);
    expect(applyLoadingPaneState).toHaveBeenCalledTimes(1);
    expect(setStoredLookup).toHaveBeenCalledWith({
      selector: '#target',
      pickPoint: { x: 1, y: 2 },
    });
    expect(result).toEqual({
      lightweight: true,
      selectedComponentIdForScript: 'comp-1',
    });
  });

  it('applies response stage and triggers finish callback', () => {
    const resetReactInspector = vi.fn();
    const applyReactInspectResult = vi.fn();
    const finish = vi.fn();

    applyReactFetchResponseStage({
      response: {
        ok: true,
        components: [],
        selectedIndex: -1,
      },
      errorText: undefined,
      fetchOptions: {
        preserveSelection: true,
      },
      resetReactInspector,
      applyReactInspectResult,
      finish,
    });

    expect(applyReactInspectResult).toHaveBeenCalledTimes(1);
    expect(finish).toHaveBeenCalledTimes(1);
    expect(resetReactInspector).not.toHaveBeenCalled();
  });

  it('maps full mode timeout to actionable status text', () => {
    const resetReactInspector = vi.fn();
    const applyReactInspectResult = vi.fn();
    const finish = vi.fn();

    applyReactFetchResponseStage({
      response: null,
      errorText: '페이지 에이전트 응답 시간이 초과되었습니다.',
      fetchOptions: {
        lightweight: false,
      },
      resetReactInspector,
      applyReactInspectResult,
      finish,
    });

    expect(resetReactInspector).toHaveBeenCalledWith(
      'Full 모드 응답 시간이 초과되었습니다. Lite 모드로 재시도하거나 범위를 좁혀주세요.',
      true,
    );
    expect(applyReactInspectResult).not.toHaveBeenCalled();
    expect(finish).toHaveBeenCalledTimes(1);
  });
});
