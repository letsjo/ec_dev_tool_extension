import type { ReactComponentInfo } from '../../../shared/inspector/types';
import { buildChildrenByParent as buildChildrenByParentValue } from './listTreeModel';
import {
  captureReactTreeScrollAnchor as captureReactTreeScrollAnchorValue,
  restoreReactTreeScrollAnchor as restoreReactTreeScrollAnchorValue,
} from './listTreeScrollAnchor';

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

/**
 * Components Tree DOM 렌더링을 전담한다.
 * scroll/selection anchor를 유지해 목록 리렌더 후에도 현재 위치가 크게 튀지 않도록 보정한다.
 */
export function renderReactComponentListTree(options: RenderReactComponentListTreeOptions) {
  const scrollAnchor = captureReactTreeScrollAnchorValue({
    treePaneEl: options.treePaneEl,
    reactComponentListEl: options.reactComponentListEl,
    selectedReactComponentIndex: options.selectedReactComponentIndex,
  });

  const childrenByParent = buildChildrenByParentValue(
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

  restoreReactTreeScrollAnchorValue({
    treePaneEl: options.treePaneEl,
    reactComponentListEl: options.reactComponentListEl,
    anchor: scrollAnchor,
  });
}
