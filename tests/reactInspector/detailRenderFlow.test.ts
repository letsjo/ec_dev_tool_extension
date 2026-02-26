import { describe, expect, it, vi } from 'vitest';
import type { ReactComponentInfo } from '../../src/shared/inspector/types';
import { createReactComponentDetailRenderFlow } from '../../src/features/panel/reactInspector/detail/detailRenderFlow';

function createComponent(id: string): ReactComponentInfo {
  return {
    id,
    parentId: null,
    name: 'Comp',
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

describe('createReactComponentDetailRenderFlow', () => {
  it('passes cache to renderer and writes back returned cache', () => {
    let lastReactDetailComponentId: string | null = 'prev';
    let lastReactDetailRenderSignature = 'sig-prev';
    const renderReactComponentDetailPanel = vi.fn(() => ({
      componentId: 'next-id',
      renderSignature: 'sig-next',
    }));
    const detailEl = document.createElement('div');

    const renderReactComponentDetail = createReactComponentDetailRenderFlow({
      readState: () => ({
        lastReactDetailComponentId,
        lastReactDetailRenderSignature,
      }),
      writeState: (update) => {
        lastReactDetailComponentId = update.lastReactDetailComponentId;
        lastReactDetailRenderSignature = update.lastReactDetailRenderSignature;
      },
      getReactComponentDetailEl: () => detailEl,
      buildRenderSignature: vi.fn(() => 'computed'),
      clearPaneContent: vi.fn(),
      createJsonSection: vi.fn(() => document.createElement('div')),
      renderReactComponentDetailPanel,
    });

    renderReactComponentDetail(createComponent('a'));

    expect(renderReactComponentDetailPanel).toHaveBeenCalledWith(
      expect.objectContaining({
        cache: {
          componentId: 'prev',
          renderSignature: 'sig-prev',
        },
      }),
    );
    expect(lastReactDetailComponentId).toBe('next-id');
    expect(lastReactDetailRenderSignature).toBe('sig-next');
  });

  it('accepts null/empty cache state', () => {
    let lastReactDetailComponentId: string | null = null;
    let lastReactDetailRenderSignature = '';
    const renderReactComponentDetailPanel = vi.fn(() => ({
      componentId: null,
      renderSignature: '',
    }));

    const renderReactComponentDetail = createReactComponentDetailRenderFlow({
      readState: () => ({
        lastReactDetailComponentId,
        lastReactDetailRenderSignature,
      }),
      writeState: (update) => {
        lastReactDetailComponentId = update.lastReactDetailComponentId;
        lastReactDetailRenderSignature = update.lastReactDetailRenderSignature;
      },
      getReactComponentDetailEl: () => document.createElement('div'),
      buildRenderSignature: vi.fn(() => 'computed'),
      clearPaneContent: vi.fn(),
      createJsonSection: vi.fn(() => document.createElement('div')),
      renderReactComponentDetailPanel,
    });

    expect(() => renderReactComponentDetail(createComponent('b'))).not.toThrow();
    expect(lastReactDetailComponentId).toBeNull();
    expect(lastReactDetailRenderSignature).toBe('');
  });
});
