import { describe, expect, it, vi } from 'vitest';
import { renderReactTreeNodes } from '../../src/features/panel/reactInspector/list/listTreeNodeRenderer';

describe('listTreeNodeRenderer', () => {
  it('renders rows and dispatches toggle/select/hover callbacks', () => {
    const reactComponentListEl = document.createElement('div') as HTMLDivElement;
    const collapsedComponentIds = new Set<string>();
    const onRequestRender = vi.fn();
    const onSelectComponent = vi.fn();
    const previewPageDomForComponent = vi.fn();
    const clearPageHoverPreview = vi.fn();

    renderReactTreeNodes({
      rootIndices: [0],
      childrenByParent: new Map<string | null, number[]>([
        [null, [0]],
        ['root', [1]],
      ]),
      reactComponents: [
        {
          id: 'root',
          parentId: null,
          name: 'RootComp',
          kind: 'function',
          depth: 0,
          hooksCount: 0,
          domSelector: '#root',
          domPath: 'html>body>#root',
          containsTarget: false,
          key: null,
          props: null,
          hooks: null,
        },
        {
          id: 'child',
          parentId: 'root',
          name: 'ChildComp',
          kind: 'function',
          depth: 1,
          hooksCount: 0,
          domSelector: null,
          domPath: null,
          containsTarget: false,
          key: null,
          props: null,
          hooks: null,
        },
      ],
      selectedReactComponentIndex: 0,
      componentSearchQuery: '',
      matchedIndexSet: new Set<number>(),
      collapsedComponentIds,
      updatedComponentIds: new Set<string>(['child']),
      reactComponentListEl,
      previewPageDomForComponent,
      clearPageHoverPreview,
      onSelectComponent,
      onRequestRender,
    });

    const toggle = reactComponentListEl.querySelector('.react-tree-toggle') as HTMLButtonElement;
    toggle.click();
    expect(collapsedComponentIds.has('root')).toBe(true);
    expect(onRequestRender).toHaveBeenCalledTimes(1);

    const item = reactComponentListEl.querySelector(
      '[data-component-index="0"]',
    ) as HTMLButtonElement;
    item.dispatchEvent(new Event('mouseenter'));
    item.dispatchEvent(new Event('mouseleave'));
    item.click();

    expect(previewPageDomForComponent).toHaveBeenCalledTimes(1);
    expect(clearPageHoverPreview).toHaveBeenCalledTimes(1);
    expect(onSelectComponent).toHaveBeenCalledWith(0);
  });
});
