import type { ReactComponentInfo } from '../../../../shared/inspector/types';

interface RenderReactTreeNodesOptions {
  rootIndices: number[];
  childrenByParent: Map<string | null, number[]>;
  reactComponents: ReactComponentInfo[];
  selectedReactComponentIndex: number;
  componentSearchQuery: string;
  matchedIndexSet: Set<number>;
  collapsedComponentIds: Set<string>;
  updatedComponentIds: Set<string>;
  reactComponentListEl: HTMLDivElement;
  previewPageDomForComponent: (component: ReactComponentInfo) => void;
  clearPageHoverPreview: () => void;
  onSelectComponent: (index: number) => void;
  onRequestRender: () => void;
}

/** components tree row 렌더와 재귀 child 렌더를 수행한다. */
function renderReactTreeNodes(options: RenderReactTreeNodesOptions) {
  const renderTreeNode = (componentIndex: number) => {
    const component = options.reactComponents[componentIndex];
    const isActive = componentIndex === options.selectedReactComponentIndex;
    const isSearchMatch =
      options.componentSearchQuery.trim().length > 0 &&
      options.matchedIndexSet.has(componentIndex);
    const isUpdated = options.updatedComponentIds.has(component.id);
    const childIndices = options.childrenByParent.get(component.id) ?? [];
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

  options.rootIndices.forEach((componentIndex) => renderTreeNode(componentIndex));
}

export { renderReactTreeNodes };
