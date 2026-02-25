import type { ReactComponentInfo } from '../../../shared/inspector/types';
import type { RuntimeRefreshLookup } from './lookup';

export interface ReactComponentDetailRenderStateUpdate {
  lastReactDetailComponentId: string | null;
  lastReactDetailRenderSignature: string;
}

export interface ReactComponentListRenderStateUpdate {
  updatedComponentIds?: Set<string>;
  lastReactListRenderSignature?: string;
}

export interface ReactInspectorResetStateUpdate {
  reactComponents: ReactComponentInfo[];
  componentSearchTexts: string[];
  componentSearchIncludeDataTokens: boolean;
  collapsedComponentIds: Set<string>;
  updatedComponentIds: Set<string>;
  selectedReactComponentIndex: number;
  lastReactListRenderSignature: string;
  lastReactDetailRenderSignature: string;
  lastReactDetailComponentId: string | null;
}

export interface ReactInspectApplyStateUpdate {
  reactComponents?: ReactComponentInfo[];
  selectedReactComponentIndex?: number;
  componentSearchIncludeDataTokens?: boolean;
  componentSearchTexts?: string[];
  collapsedComponentIds?: Set<string>;
  updatedComponentIds?: Set<string>;
}

export interface ReactInspectorMutableState {
  reactComponents: ReactComponentInfo[];
  selectedReactComponentIndex: number;
  storedLookup: RuntimeRefreshLookup | null;
  componentSearchQuery: string;
  componentSearchTexts: string[];
  componentSearchIncludeDataTokens: boolean;
  collapsedComponentIds: Set<string>;
  lastReactListRenderSignature: string;
  lastReactDetailRenderSignature: string;
  lastReactDetailComponentId: string | null;
  updatedComponentIds: Set<string>;
}

/** controller state의 기본 mutable 모델을 초기화한다. */
export function createReactInspectorMutableState(): ReactInspectorMutableState {
  return {
    reactComponents: [],
    selectedReactComponentIndex: -1,
    storedLookup: null,
    componentSearchQuery: '',
    componentSearchTexts: [],
    componentSearchIncludeDataTokens: true,
    collapsedComponentIds: new Set<string>(),
    lastReactListRenderSignature: '',
    lastReactDetailRenderSignature: '',
    lastReactDetailComponentId: null,
    updatedComponentIds: new Set<string>(),
  };
}

/** list render state patch를 mutable 모델에 반영한다. */
export function writeListRenderStateUpdate(
  state: ReactInspectorMutableState,
  update: ReactComponentListRenderStateUpdate,
) {
  if (update.updatedComponentIds) {
    state.updatedComponentIds = update.updatedComponentIds;
  }
  if (typeof update.lastReactListRenderSignature === 'string') {
    state.lastReactListRenderSignature = update.lastReactListRenderSignature;
  }
}

/** detail render state patch를 mutable 모델에 반영한다. */
export function writeDetailRenderStateUpdate(
  state: ReactInspectorMutableState,
  update: ReactComponentDetailRenderStateUpdate,
) {
  state.lastReactDetailComponentId = update.lastReactDetailComponentId;
  state.lastReactDetailRenderSignature = update.lastReactDetailRenderSignature;
}

/** reset state patch를 mutable 모델에 반영한다. */
export function writeResetStateUpdate(
  state: ReactInspectorMutableState,
  update: ReactInspectorResetStateUpdate,
) {
  state.reactComponents = update.reactComponents;
  state.componentSearchTexts = update.componentSearchTexts;
  state.componentSearchIncludeDataTokens = update.componentSearchIncludeDataTokens;
  state.collapsedComponentIds = update.collapsedComponentIds;
  state.updatedComponentIds = update.updatedComponentIds;
  state.selectedReactComponentIndex = update.selectedReactComponentIndex;
  state.lastReactListRenderSignature = update.lastReactListRenderSignature;
  state.lastReactDetailRenderSignature = update.lastReactDetailRenderSignature;
  state.lastReactDetailComponentId = update.lastReactDetailComponentId;
}

/** apply-result state patch를 mutable 모델에 반영한다. */
export function writeApplyResultStateUpdate(
  state: ReactInspectorMutableState,
  update: ReactInspectApplyStateUpdate,
) {
  if (update.reactComponents) {
    state.reactComponents = update.reactComponents;
  }
  if (update.updatedComponentIds) {
    state.updatedComponentIds = update.updatedComponentIds;
  }
  if (typeof update.componentSearchIncludeDataTokens === 'boolean') {
    state.componentSearchIncludeDataTokens = update.componentSearchIncludeDataTokens;
  }
  if (update.componentSearchTexts) {
    state.componentSearchTexts = update.componentSearchTexts;
  }
  if (update.collapsedComponentIds) {
    state.collapsedComponentIds = update.collapsedComponentIds;
  }
  if (typeof update.selectedReactComponentIndex === 'number') {
    state.selectedReactComponentIndex = update.selectedReactComponentIndex;
  }
}
