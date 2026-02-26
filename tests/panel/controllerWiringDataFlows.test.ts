import { describe, expect, it, vi } from 'vitest';
import { createControllerWiringDataFlows } from '../../src/features/panel/controllerWiringDataFlows';

describe('createControllerWiringDataFlows', () => {
  it('composes target/dom/selection flow dependencies', () => {
    const populateTargetSelect = vi.fn();
    const onFetch = vi.fn();
    const fetchDomTree = vi.fn();
    const clearPageComponentHighlight = vi.fn();
    const clearPageHoverPreview = vi.fn();
    const previewPageDomForComponent = vi.fn();
    const highlightPageDomForComponent = vi.fn();
    const createTargetFetchFlow = vi.fn(() => ({
      populateTargetSelect,
      onFetch,
    }));
    const createDomTreeFetchFlow = vi.fn(() => ({
      fetchDomTree,
    }));
    const createPanelSelectionSyncHandlers = vi.fn(() => ({
      clearPageComponentHighlight,
      clearPageHoverPreview,
      previewPageDomForComponent,
      highlightPageDomForComponent,
    }));

    const callInspectedPageAgent = vi.fn();
    const setOutput = vi.fn();
    const setReactStatus = vi.fn();
    const setElementOutput = vi.fn();
    const setDomTreeStatus = vi.fn();
    const setDomTreeEmpty = vi.fn();

    const result = createControllerWiringDataFlows(
      {
        callInspectedPageAgent,
        getTargetSelectEl: vi.fn() as () => HTMLSelectElement,
        getFetchBtnEl: vi.fn() as () => HTMLButtonElement,
        getDomTreeOutputEl: vi.fn() as () => HTMLDivElement,
        setOutput,
        setReactStatus,
        setElementOutput,
        setDomTreeStatus,
        setDomTreeEmpty,
      },
      {
        createTargetFetchFlow,
        createDomTreeFetchFlow,
        createPanelSelectionSyncHandlers,
      },
    );

    expect(createTargetFetchFlow).toHaveBeenCalledWith(
      expect.objectContaining({
        callInspectedPageAgent,
        setOutput,
      }),
    );
    expect(createDomTreeFetchFlow).toHaveBeenCalledWith(
      expect.objectContaining({
        callInspectedPageAgent,
        setDomTreeStatus,
        setDomTreeEmpty,
      }),
    );
    expect(createPanelSelectionSyncHandlers).toHaveBeenCalledWith(
      expect.objectContaining({
        callInspectedPageAgent,
        setReactStatus,
        setElementOutput,
        setDomTreeStatus,
        setDomTreeEmpty,
        fetchDomTree,
      }),
    );
    expect(result).toEqual({
      populateTargetSelect,
      onFetch,
      fetchDomTree,
      clearPageComponentHighlight,
      clearPageHoverPreview,
      previewPageDomForComponent,
      highlightPageDomForComponent,
    });
  });
});
