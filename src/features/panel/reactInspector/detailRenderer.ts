import type {
  JsonSectionKind,
  ReactComponentInfo,
} from '../../../shared/inspector/types';

export interface ReactComponentDetailRenderCache {
  componentId: string | null;
  renderSignature: string;
}

interface RenderReactComponentDetailPanelOptions {
  component: ReactComponentInfo;
  cache: ReactComponentDetailRenderCache;
  reactComponentDetailEl: HTMLDivElement;
  buildRenderSignature: (component: ReactComponentInfo) => string;
  clearPaneContent: (element: HTMLElement) => void;
  createJsonSection: (
    title: string,
    value: unknown,
    component: ReactComponentInfo,
    sectionKind: JsonSectionKind,
  ) => HTMLElement;
}

/**
 * 선택 컴포넌트 상세 패널의 DOM을 렌더링하고 캐시를 갱신한다.
 * signature 캐시가 동일하면 DOM 갱신을 건너뛰어 불필요한 재렌더를 줄인다.
 */
export function renderReactComponentDetailPanel(
  options: RenderReactComponentDetailPanelOptions,
): ReactComponentDetailRenderCache {
  const nextSignature = options.buildRenderSignature(options.component);
  if (
    options.component.id === options.cache.componentId &&
    nextSignature === options.cache.renderSignature
  ) {
    return options.cache;
  }

  options.clearPaneContent(options.reactComponentDetailEl);
  options.reactComponentDetailEl.classList.remove('empty');

  const content = document.createElement('div');
  content.className = 'react-component-detail-content';

  const title = document.createElement('div');
  title.className = 'react-detail-title';
  title.textContent = options.component.name;
  content.appendChild(title);

  const meta = document.createElement('div');
  meta.className = 'react-detail-meta';
  meta.textContent = `kind: ${options.component.kind} | hook count: ${options.component.hookCount}`;
  content.appendChild(meta);

  content.appendChild(
    options.createJsonSection('props', options.component.props, options.component, 'props'),
  );
  content.appendChild(
    options.createJsonSection('hooks', options.component.hooks, options.component, 'hooks'),
  );
  options.reactComponentDetailEl.appendChild(content);

  return {
    componentId: options.component.id,
    renderSignature: nextSignature,
  };
}
