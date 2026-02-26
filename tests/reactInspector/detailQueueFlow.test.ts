import { describe, expect, it, vi } from 'vitest';
import type { ReactComponentInfo } from '../../src/shared/inspector/types';
import { createReactDetailQueueFlow } from '../../src/features/panel/reactInspector/detail/detailQueueFlow';
import { applySelectedComponentDetailResult } from '../../src/features/panel/reactInspector/detail/detailApply';

function createComponent(id: string): ReactComponentInfo {
  return {
    id,
    parentId: null,
    name: `Component${id}`,
    kind: 'function',
    depth: 0,
    props: { old: true },
    hooks: [],
    hookCount: 0,
    domSelector: null,
    domPath: null,
    domTagName: null,
    hasSerializedData: false,
  };
}

describe('createReactDetailQueueFlow', () => {
  it('wires detail queue callbacks and applies selected detail into state', () => {
    let reactComponents: ReactComponentInfo[] = [createComponent('a'), createComponent('b')];
    let selectedReactComponentIndex = 0;
    const componentSearchTexts: string[] = ['', ''];
    const renderReactComponentDetail = vi.fn();
    const patchComponentSearchTextCacheAt = vi.fn();
    let capturedQueueOptions: any = null;
    const createReactDetailFetchQueue = vi.fn((options: any) => {
      capturedQueueOptions = options;
      return {
        request: vi.fn(),
        getLastFailedAt: vi.fn(),
        reset: vi.fn(),
      };
    });

    const flow = createReactDetailQueueFlow(
      {
        cooldownMs: 2500,
        callInspectedPageAgent: vi.fn(),
        getLookup: () => ({ selector: '#target' }),
        getReactComponents: () => reactComponents,
        setReactComponents: (nextComponents) => {
          reactComponents = nextComponents;
        },
        getSelectedReactComponentIndex: () => selectedReactComponentIndex,
        getComponentSearchTexts: () => componentSearchTexts,
        getComponentSearchIncludeDataTokens: () => true,
        patchComponentSearchTextCacheAt,
        renderReactComponentDetail,
        setReactDetailEmpty: vi.fn(),
      },
      {
        applySelectedComponentDetailResult,
        createReactDetailFetchQueue,
      },
    );

    expect(flow.detailFetchQueue).toBeTruthy();
    expect(createReactDetailFetchQueue).toHaveBeenCalledWith(
      expect.objectContaining({
        cooldownMs: 2500,
      }),
    );

    const applied = capturedQueueOptions.applySelectedComponentDetail({
      ok: true,
      componentId: 'a',
      props: { next: 1 },
      hooks: [{ name: 'useState' }],
      hookCount: 1,
    });
    expect(applied).toBe(true);
    expect(reactComponents[0].props).toEqual({ next: 1 });
    expect(reactComponents[0].hasSerializedData).toBe(true);
    expect(patchComponentSearchTextCacheAt).toHaveBeenCalledTimes(1);
    expect(renderReactComponentDetail).toHaveBeenCalledTimes(1);

    selectedReactComponentIndex = -1;
    expect(capturedQueueOptions.getSelectedComponent()).toBeNull();
    selectedReactComponentIndex = 1;
    expect(capturedQueueOptions.getSelectedComponent()?.id).toBe('b');
    expect(capturedQueueOptions.findComponentById('a')?.id).toBe('a');
  });
});
