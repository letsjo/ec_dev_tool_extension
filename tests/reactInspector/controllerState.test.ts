import { describe, expect, it } from 'vitest';
import { createReactInspectorControllerState } from '../../src/features/panel/reactInspector/controllerState';

describe('createReactInspectorControllerState', () => {
  it('applies list/detail state updates through dedicated writers', () => {
    const state = createReactInspectorControllerState();

    const updatedIds = new Set(['cmp-1']);
    state.writeListRenderState({
      lastReactListRenderSignature: 'list-signature',
      updatedComponentIds: updatedIds,
    });
    state.writeDetailRenderState({
      lastReactDetailComponentId: 'cmp-1',
      lastReactDetailRenderSignature: 'detail-signature',
    });

    expect(state.getLastReactListRenderSignature()).toBe('list-signature');
    expect(state.getUpdatedComponentIds()).toBe(updatedIds);
    expect(state.getLastReactDetailComponentId()).toBe('cmp-1');
    expect(state.getLastReactDetailRenderSignature()).toBe('detail-signature');
  });

  it('applies reset/apply updates and preserves optional fields', () => {
    const state = createReactInspectorControllerState();

    state.writeResetState({
      reactComponents: [],
      componentSearchTexts: ['before'],
      componentSearchIncludeDataTokens: false,
      collapsedComponentIds: new Set(['cmp-2']),
      updatedComponentIds: new Set(['cmp-3']),
      selectedReactComponentIndex: 2,
      lastReactListRenderSignature: 'before-list',
      lastReactDetailRenderSignature: 'before-detail',
      lastReactDetailComponentId: 'cmp-2',
    });

    state.writeApplyResultState({
      componentSearchIncludeDataTokens: true,
      selectedReactComponentIndex: 1,
    });

    expect(state.getComponentSearchIncludeDataTokens()).toBe(true);
    expect(state.getSelectedReactComponentIndex()).toBe(1);
    expect(state.getComponentSearchTexts()).toEqual(['before']);
    expect(state.getCollapsedComponentIds()).toEqual(new Set(['cmp-2']));
  });
});
