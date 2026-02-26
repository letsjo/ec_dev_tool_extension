import type {
  ComponentFilterResult,
  JsonSectionKind,
  ReactComponentInfo,
} from '../../../shared/inspector';
import {
  buildComponentIndexById as buildComponentIndexByIdValue,
  ensureComponentSearchTextCache as ensureComponentSearchTextCacheValue,
  expandAncestorPaths as expandAncestorPathsValue,
  getComponentFilterResult as getComponentFilterResultValue,
} from './search';
import {
  buildReactComponentDetailRenderSignature as buildReactComponentDetailRenderSignatureValue,
  buildReactListRenderSignature as buildReactListRenderSignatureValue,
} from './signatures';
import { createReactJsonSection as createReactJsonSectionValue } from './jsonSection';
import type {
  FetchSerializedValueAtPathHandler,
  InspectFunctionAtPathHandler,
} from './jsonRenderTypes';
import type { ReactInspectorControllerState } from './controllerState';

interface CreateReactInspectorControllerDerivationsOptions {
  state: ReactInspectorControllerState;
  inspectFunctionAtPath: InspectFunctionAtPathHandler;
  fetchSerializedValueAtPath: FetchSerializedValueAtPathHandler;
}

export interface ReactInspectorControllerDerivations {
  buildReactComponentDetailRenderSignature: (component: ReactComponentInfo) => string;
  buildReactListRenderSignature: (
    filterResult: ComponentFilterResult,
    matchedIndexSet: Set<number>,
  ) => string;
  createJsonSection: (
    title: string,
    value: unknown,
    component: ReactComponentInfo,
    sectionKind: JsonSectionKind,
  ) => HTMLElement;
  getComponentFilterResult: () => ComponentFilterResult;
  buildComponentIndexById: () => Map<string, number>;
  expandAncestorPaths: (indices: number[]) => void;
}

/**
 * controllerFlows에서 반복되는 파생 계산/검색 캐시 갱신/JSON 섹션 렌더 결선을 분리한다.
 * 조립부는 해당 helper를 주입만 하고 flow 오케스트레이션에 집중한다.
 */
export function createReactInspectorControllerDerivations(
  options: CreateReactInspectorControllerDerivationsOptions,
): ReactInspectorControllerDerivations {
  return {
    buildReactComponentDetailRenderSignature(component) {
      return buildReactComponentDetailRenderSignatureValue(component);
    },
    buildReactListRenderSignature(filterResult, matchedIndexSet) {
      return buildReactListRenderSignatureValue(
        options.state.getReactComponents(),
        options.state.getComponentSearchQuery(),
        options.state.getSelectedReactComponentIndex(),
        options.state.getCollapsedComponentIds(),
        filterResult,
        matchedIndexSet,
      );
    },
    createJsonSection(title, value, component, sectionKind) {
      return createReactJsonSectionValue({
        title,
        value,
        component,
        sectionKind,
        onInspectFunctionAtPath: options.inspectFunctionAtPath,
        onFetchSerializedValueAtPath: options.fetchSerializedValueAtPath,
      });
    },
    getComponentFilterResult() {
      options.state.setComponentSearchTexts(
        ensureComponentSearchTextCacheValue(
          options.state.getReactComponents(),
          options.state.getComponentSearchQuery(),
          options.state.getComponentSearchTexts(),
          options.state.getComponentSearchIncludeDataTokens(),
        ),
      );
      return getComponentFilterResultValue(
        options.state.getReactComponents(),
        options.state.getComponentSearchQuery(),
        options.state.getComponentSearchTexts(),
      );
    },
    buildComponentIndexById() {
      return buildComponentIndexByIdValue(options.state.getReactComponents());
    },
    expandAncestorPaths(indices) {
      expandAncestorPathsValue(
        options.state.getReactComponents(),
        indices,
        options.state.getCollapsedComponentIds(),
      );
    },
  };
}
