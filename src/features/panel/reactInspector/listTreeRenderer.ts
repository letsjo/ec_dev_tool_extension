import type { ReactComponentInfo } from '../../../shared/inspector/types';

interface RenderReactComponentListTreeOptions {
  reactComponents: ReactComponentInfo[];
  visibleIndices: number[];
  matchedIndexSet: Set<number>;
  selectedReactComponentIndex: number;
  componentSearchQuery: string;
  collapsedComponentIds: Set<string>;
  updatedComponentIds: Set<string>;
  treePaneEl: HTMLDivElement;
  reactComponentListEl: HTMLDivElement;
  idToIndex: Map<string, number>;
  clearPaneContent: (element: HTMLElement) => void;
  previewPageDomForComponent: (component: ReactComponentInfo) => void;
  clearPageHoverPreview: () => void;
  onSelectComponent: (index: number) => void;
  onRequestRender: () => void;
}

function buildChildrenByParent(
  reactComponents: ReactComponentInfo[],
  visibleIndices: number[],
  idToIndex: Map<string, number>,
) {
  const visibleSet = new Set<number>(visibleIndices);
  const childrenByParent = new Map<string | null, number[]>();

  const pushChild = (parentId: string | null, componentIndex: number) => {
    const children = childrenByParent.get(parentId) ?? [];
    children.push(componentIndex);
    childrenByParent.set(parentId, children);
  };

  visibleIndices.forEach((componentIndex) => {
    const component = reactComponents[componentIndex];
    const parentId = component.parentId;
    if (!parentId) {
      pushChild(null, componentIndex);
      return;
    }

    const parentIndex = idToIndex.get(parentId);
    if (parentIndex === undefined || !visibleSet.has(parentIndex)) {
      pushChild(null, componentIndex);
      return;
    }
    pushChild(parentId, componentIndex);
  });

  return childrenByParent;
}

/**
 * Components Tree DOM 렌더링을 전담한다.
 * scroll/selection anchor를 유지해 목록 리렌더 후에도 현재 위치가 크게 튀지 않도록 보정한다.
 */
export function renderReactComponentListTree(options: RenderReactComponentListTreeOptions) {
  const previousScrollTop = options.treePaneEl.scrollTop;
  const previousScrollLeft = options.treePaneEl.scrollLeft;
  const selectedItemSelector =
    options.selectedReactComponentIndex >= 0
      ? `.react-component-item[data-component-index="${options.selectedReactComponentIndex}"]`
      : '';
  const previousSelectedItem = selectedItemSelector
    ? options.reactComponentListEl.querySelector<HTMLElement>(selectedItemSelector)
    : null;
  const previousContainerTop = options.treePaneEl.getBoundingClientRect().top;
  const previousSelectedOffsetTop = previousSelectedItem
    ? previousSelectedItem.getBoundingClientRect().top - previousContainerTop
    : null;

  const childrenByParent = buildChildrenByParent(
    options.reactComponents,
    options.visibleIndices,
    options.idToIndex,
  );

  options.clearPaneContent(options.reactComponentListEl);
  options.reactComponentListEl.classList.remove('empty');

  const renderTreeNode = (componentIndex: number) => {
    const component = options.reactComponents[componentIndex];
    const isActive = componentIndex === options.selectedReactComponentIndex;
    const isSearchMatch =
      options.componentSearchQuery.trim().length > 0 &&
      options.matchedIndexSet.has(componentIndex);
    const isUpdated = options.updatedComponentIds.has(component.id);
    const childIndices = childrenByParent.get(component.id) ?? [];
    const hasChildren = childIndices.length > 0;
    const isCollapsed = hasChildren && options.collapsedComponentIds.has(component.id);

    const row = document.createElement('div');
    row.className = 'react-tree-row';
    row.style.paddingLeft = `${6 + component.depth * 12}px`;

    if (hasChildren) {
      const toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'react-tree-toggle';
      toggle.textContent = isCollapsed ? '▸' : '▾';
      toggle.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (options.collapsedComponentIds.has(component.id)) {
          options.collapsedComponentIds.delete(component.id);
        } else {
          options.collapsedComponentIds.add(component.id);
        }
        options.onRequestRender();
      });
      row.appendChild(toggle);
    } else {
      const spacer = document.createElement('span');
      spacer.className = 'react-tree-spacer';
      spacer.textContent = ' ';
      row.appendChild(spacer);
    }

    const item = document.createElement('button');
    item.type = 'button';
    item.dataset.componentIndex = String(componentIndex);
    item.className =
      'react-component-item' +
      (isActive ? ' active' : '') +
      (isSearchMatch ? ' search-match' : '') +
      (isUpdated ? ' updated-flash' : '');
    const domBadge = component.domSelector ? ' [DOM]' : ' [No DOM]';
    item.textContent =
      `${component.name} · ${component.kind}${domBadge}` +
      (componentIndex === options.selectedReactComponentIndex ? ' (selected)' : '');
    item.addEventListener('mouseenter', () => {
      options.previewPageDomForComponent(component);
    });
    item.addEventListener('mouseleave', () => {
      options.clearPageHoverPreview();
    });
    item.addEventListener('focus', () => {
      options.previewPageDomForComponent(component);
    });
    item.addEventListener('blur', () => {
      options.clearPageHoverPreview();
    });
    item.addEventListener('click', () => {
      options.onSelectComponent(componentIndex);
    });
    row.appendChild(item);
    options.reactComponentListEl.appendChild(row);

    if (!isCollapsed) {
      childIndices.forEach((childIndex) => {
        renderTreeNode(childIndex);
      });
    }
  };

  const rootIndices = childrenByParent.get(null) ?? [];
  rootIndices.forEach((componentIndex) => renderTreeNode(componentIndex));

  if (previousSelectedOffsetTop !== null && selectedItemSelector) {
    const nextSelectedItem = options.reactComponentListEl.querySelector<HTMLElement>(
      selectedItemSelector,
    );
    if (nextSelectedItem) {
      const nextContainerTop = options.treePaneEl.getBoundingClientRect().top;
      const nextSelectedOffsetTop = nextSelectedItem.getBoundingClientRect().top - nextContainerTop;
      options.treePaneEl.scrollTop += nextSelectedOffsetTop - previousSelectedOffsetTop;
    } else {
      options.treePaneEl.scrollTop = previousScrollTop;
    }
  } else {
    options.treePaneEl.scrollTop = previousScrollTop;
  }
  options.treePaneEl.scrollLeft = previousScrollLeft;
}
