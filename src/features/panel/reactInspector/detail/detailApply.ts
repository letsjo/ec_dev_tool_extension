import type {
  ReactComponentDetailResult,
  ReactComponentInfo,
} from '../../../../shared/inspector/types';

interface ApplySelectedComponentDetailResultOptions {
  result: ReactComponentDetailResult;
  reactComponents: ReactComponentInfo[];
  componentSearchTexts: string[];
  componentSearchIncludeDataTokens: boolean;
  selectedReactComponentIndex: number;
  patchComponentSearchTextCacheAt: (
    reactComponents: ReactComponentInfo[],
    componentSearchTexts: string[],
    index: number,
    includeDataTokens: boolean,
  ) => void;
  renderReactComponentDetail: (component: ReactComponentInfo) => void;
}

interface AppliedSelectedComponentDetailResult {
  applied: boolean;
  reactComponents: ReactComponentInfo[];
}

/**
 * 선택 컴포넌트 상세 응답(props/hooks)을 목록 상태에 병합한다.
 * 검색 캐시 패치와 선택 상세 재렌더 조건까지 한 번에 처리한다.
 */
export function applySelectedComponentDetailResult(
  options: ApplySelectedComponentDetailResultOptions,
): AppliedSelectedComponentDetailResult {
  if (!options.result.ok || typeof options.result.componentId !== 'string') {
    return {
      applied: false,
      reactComponents: options.reactComponents,
    };
  }

  const componentIndex = options.reactComponents.findIndex(
    (component) => component.id === options.result.componentId,
  );
  if (componentIndex < 0) {
    return {
      applied: false,
      reactComponents: options.reactComponents,
    };
  }

  const previous = options.reactComponents[componentIndex];
  const next: ReactComponentInfo = {
    ...previous,
    props: options.result.props,
    hooks: options.result.hooks,
    hookCount:
      typeof options.result.hookCount === 'number'
        ? options.result.hookCount
        : previous.hookCount,
    hasSerializedData: true,
  };
  const nextReactComponents = [...options.reactComponents];
  nextReactComponents[componentIndex] = next;

  options.patchComponentSearchTextCacheAt(
    nextReactComponents,
    options.componentSearchTexts,
    componentIndex,
    options.componentSearchIncludeDataTokens,
  );

  if (options.selectedReactComponentIndex === componentIndex) {
    options.renderReactComponentDetail(next);
  }

  return {
    applied: true,
    reactComponents: nextReactComponents,
  };
}
