import { describe, expect, it } from 'vitest';
import type { ReactComponentInfo } from '../../src/shared/inspector';
import {
  createReactInspectorMutableState,
  writeApplyResultStateUpdate,
  writeDetailRenderStateUpdate,
  writeListRenderStateUpdate,
  writeResetStateUpdate,
} from '../../src/features/panel/reactInspector/controllerStateModel';

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

describe('controllerStateModel', () => {
  it('creates default mutable state', () => {
    const state = createReactInspectorMutableState();

    expect(state.reactComponents).toEqual([]);
    expect(state.selectedReactComponentIndex).toBe(-1);
    expect(state.componentSearchIncludeDataTokens).toBe(true);
    expect(state.collapsedComponentIds).toEqual(new Set());
    expect(state.updatedComponentIds).toEqual(new Set());
  });

  it('applies list/detail/reset updates', () => {
    const state = createReactInspectorMutableState();
    const updatedIds = new Set(['cmp-1']);
    const collapsedIds = new Set(['cmp-2']);

    writeListRenderStateUpdate(state, {
      updatedComponentIds: updatedIds,
      lastReactListRenderSignature: 'list-signature',
    });
    writeDetailRenderStateUpdate(state, {
      lastReactDetailComponentId: 'cmp-1',
      lastReactDetailRenderSignature: 'detail-signature',
    });
    writeResetStateUpdate(state, {
      reactComponents: [createComponent('cmp-1')],
      componentSearchTexts: ['query'],
      componentSearchIncludeDataTokens: false,
      collapsedComponentIds: collapsedIds,
      updatedComponentIds: updatedIds,
      selectedReactComponentIndex: 0,
      lastReactListRenderSignature: 'reset-list',
      lastReactDetailRenderSignature: 'reset-detail',
      lastReactDetailComponentId: 'cmp-2',
    });

    expect(state.reactComponents).toHaveLength(1);
    expect(state.componentSearchTexts).toEqual(['query']);
    expect(state.componentSearchIncludeDataTokens).toBe(false);
    expect(state.collapsedComponentIds).toBe(collapsedIds);
    expect(state.updatedComponentIds).toBe(updatedIds);
    expect(state.selectedReactComponentIndex).toBe(0);
    expect(state.lastReactListRenderSignature).toBe('reset-list');
    expect(state.lastReactDetailRenderSignature).toBe('reset-detail');
    expect(state.lastReactDetailComponentId).toBe('cmp-2');
  });

  it('applies optional apply-result updates without overriding omitted fields', () => {
    const state = createReactInspectorMutableState();
    const initialCollapsed = new Set(['cmp-1']);
    const initialTexts = ['before'];
    state.collapsedComponentIds = initialCollapsed;
    state.componentSearchTexts = initialTexts;
    state.selectedReactComponentIndex = 3;

    writeApplyResultStateUpdate(state, {
      componentSearchIncludeDataTokens: false,
      selectedReactComponentIndex: 1,
    });

    expect(state.componentSearchIncludeDataTokens).toBe(false);
    expect(state.selectedReactComponentIndex).toBe(1);
    expect(state.collapsedComponentIds).toBe(initialCollapsed);
    expect(state.componentSearchTexts).toBe(initialTexts);
  });
});
