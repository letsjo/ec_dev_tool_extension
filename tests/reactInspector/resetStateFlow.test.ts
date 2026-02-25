import { describe, expect, it, vi } from 'vitest';
import { createReactInspectorResetStateFlow } from '../../src/features/panel/reactInspector/resetStateFlow';

interface MutableResetState {
  reactComponents: unknown[];
  componentSearchTexts: string[];
  componentSearchIncludeDataTokens: boolean;
  collapsedComponentIds: Set<string>;
  updatedComponentIds: Set<string>;
  selectedReactComponentIndex: number;
  lastReactListRenderSignature: string;
  lastReactDetailRenderSignature: string;
  lastReactDetailComponentId: string | null;
}

describe('createReactInspectorResetStateFlow', () => {
  it('resets react inspector state and applies reset pane state', () => {
    const state: MutableResetState = {
      reactComponents: [{ id: 'a' }],
      componentSearchTexts: ['a'],
      componentSearchIncludeDataTokens: false,
      collapsedComponentIds: new Set(['a']),
      updatedComponentIds: new Set(['b']),
      selectedReactComponentIndex: 3,
      lastReactListRenderSignature: 'sig-1',
      lastReactDetailRenderSignature: 'sig-2',
      lastReactDetailComponentId: 'a',
    };

    const resetDetailFetchQueue = vi.fn();
    const clearPageHoverPreview = vi.fn();
    const clearPageComponentHighlight = vi.fn();
    const applyResetPaneState = vi.fn();

    const resetReactInspector = createReactInspectorResetStateFlow({
      writeState: (update) => {
        state.reactComponents = update.reactComponents;
        state.componentSearchTexts = update.componentSearchTexts;
        state.componentSearchIncludeDataTokens = update.componentSearchIncludeDataTokens;
        state.collapsedComponentIds = update.collapsedComponentIds;
        state.updatedComponentIds = update.updatedComponentIds;
        state.selectedReactComponentIndex = update.selectedReactComponentIndex;
        state.lastReactListRenderSignature = update.lastReactListRenderSignature;
        state.lastReactDetailRenderSignature = update.lastReactDetailRenderSignature;
        state.lastReactDetailComponentId = update.lastReactDetailComponentId;
      },
      resetDetailFetchQueue,
      clearPageHoverPreview,
      clearPageComponentHighlight,
      applyResetPaneState,
    });

    resetReactInspector('초기화 완료', true);

    expect(state.reactComponents).toEqual([]);
    expect(state.componentSearchTexts).toEqual([]);
    expect(state.componentSearchIncludeDataTokens).toBe(true);
    expect(state.collapsedComponentIds.size).toBe(0);
    expect(state.updatedComponentIds.size).toBe(0);
    expect(state.selectedReactComponentIndex).toBe(-1);
    expect(state.lastReactListRenderSignature).toBe('');
    expect(state.lastReactDetailRenderSignature).toBe('');
    expect(state.lastReactDetailComponentId).toBeNull();

    expect(resetDetailFetchQueue).toHaveBeenCalledTimes(1);
    expect(clearPageHoverPreview).toHaveBeenCalledTimes(1);
    expect(clearPageComponentHighlight).toHaveBeenCalledTimes(1);
    expect(applyResetPaneState).toHaveBeenCalledWith('초기화 완료', true);
  });

  it('uses false as default error flag', () => {
    const applyResetPaneState = vi.fn();
    const resetReactInspector = createReactInspectorResetStateFlow({
      writeState: vi.fn(),
      resetDetailFetchQueue: vi.fn(),
      clearPageHoverPreview: vi.fn(),
      clearPageComponentHighlight: vi.fn(),
      applyResetPaneState,
    });

    resetReactInspector('기본');

    expect(applyResetPaneState).toHaveBeenCalledWith('기본', false);
  });
});
