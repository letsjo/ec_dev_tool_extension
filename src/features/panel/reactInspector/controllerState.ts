import type { ReactComponentInfo } from '../../../shared/inspector/types';
import type { RuntimeRefreshLookup } from './lookup';
import {
  createReactInspectorMutableState,
  writeApplyResultStateUpdate,
  writeDetailRenderStateUpdate,
  writeListRenderStateUpdate,
  writeResetStateUpdate,
  type ReactComponentDetailRenderStateUpdate,
  type ReactComponentListRenderStateUpdate,
  type ReactInspectApplyStateUpdate,
  type ReactInspectorResetStateUpdate,
} from './controllerStateModel';

export interface ReactInspectorControllerState {
  getReactComponents: () => ReactComponentInfo[];
  setReactComponents: (value: ReactComponentInfo[]) => void;
  getSelectedReactComponentIndex: () => number;
  setSelectedReactComponentIndex: (value: number) => void;
  getStoredLookup: () => RuntimeRefreshLookup | null;
  setStoredLookup: (value: RuntimeRefreshLookup | null) => void;
  getComponentSearchQuery: () => string;
  setComponentSearchQuery: (value: string) => void;
  getComponentSearchTexts: () => string[];
  setComponentSearchTexts: (value: string[]) => void;
  getComponentSearchIncludeDataTokens: () => boolean;
  setComponentSearchIncludeDataTokens: (value: boolean) => void;
  getCollapsedComponentIds: () => Set<string>;
  setCollapsedComponentIds: (value: Set<string>) => void;
  getLastReactListRenderSignature: () => string;
  setLastReactListRenderSignature: (value: string) => void;
  getLastReactDetailRenderSignature: () => string;
  setLastReactDetailRenderSignature: (value: string) => void;
  getLastReactDetailComponentId: () => string | null;
  setLastReactDetailComponentId: (value: string | null) => void;
  getUpdatedComponentIds: () => Set<string>;
  setUpdatedComponentIds: (value: Set<string>) => void;
  readDetailRenderState: () => {
    lastReactDetailComponentId: string | null;
    lastReactDetailRenderSignature: string;
  };
  writeDetailRenderState: (update: ReactComponentDetailRenderStateUpdate) => void;
  readListRenderState: () => {
    reactComponents: ReactComponentInfo[];
    componentSearchQuery: string;
    selectedReactComponentIndex: number;
    collapsedComponentIds: Set<string>;
    updatedComponentIds: Set<string>;
    lastReactListRenderSignature: string;
  };
  writeListRenderState: (update: ReactComponentListRenderStateUpdate) => void;
  writeResetState: (update: ReactInspectorResetStateUpdate) => void;
  readApplyResultState: () => {
    reactComponents: ReactComponentInfo[];
    selectedReactComponentIndex: number;
    collapsedComponentIds: Set<string>;
  };
  writeApplyResultState: (update: ReactInspectApplyStateUpdate) => void;
}

/** controller의 React inspector mutable 상태를 한 곳에서 관리한다. */
export function createReactInspectorControllerState(): ReactInspectorControllerState {
  const state = createReactInspectorMutableState();

  return {
    getReactComponents: () => state.reactComponents,
    setReactComponents(value) {
      state.reactComponents = value;
    },
    getSelectedReactComponentIndex: () => state.selectedReactComponentIndex,
    setSelectedReactComponentIndex(value) {
      state.selectedReactComponentIndex = value;
    },
    getStoredLookup: () => state.storedLookup,
    setStoredLookup(value) {
      state.storedLookup = value;
    },
    getComponentSearchQuery: () => state.componentSearchQuery,
    setComponentSearchQuery(value) {
      state.componentSearchQuery = value;
    },
    getComponentSearchTexts: () => state.componentSearchTexts,
    setComponentSearchTexts(value) {
      state.componentSearchTexts = value;
    },
    getComponentSearchIncludeDataTokens: () => state.componentSearchIncludeDataTokens,
    setComponentSearchIncludeDataTokens(value) {
      state.componentSearchIncludeDataTokens = value;
    },
    getCollapsedComponentIds: () => state.collapsedComponentIds,
    setCollapsedComponentIds(value) {
      state.collapsedComponentIds = value;
    },
    getLastReactListRenderSignature: () => state.lastReactListRenderSignature,
    setLastReactListRenderSignature(value) {
      state.lastReactListRenderSignature = value;
    },
    getLastReactDetailRenderSignature: () => state.lastReactDetailRenderSignature,
    setLastReactDetailRenderSignature(value) {
      state.lastReactDetailRenderSignature = value;
    },
    getLastReactDetailComponentId: () => state.lastReactDetailComponentId,
    setLastReactDetailComponentId(value) {
      state.lastReactDetailComponentId = value;
    },
    getUpdatedComponentIds: () => state.updatedComponentIds,
    setUpdatedComponentIds(value) {
      state.updatedComponentIds = value;
    },
    readDetailRenderState: () => ({
      lastReactDetailComponentId: state.lastReactDetailComponentId,
      lastReactDetailRenderSignature: state.lastReactDetailRenderSignature,
    }),
    writeDetailRenderState(update) {
      writeDetailRenderStateUpdate(state, update);
    },
    readListRenderState: () => ({
      reactComponents: state.reactComponents,
      componentSearchQuery: state.componentSearchQuery,
      selectedReactComponentIndex: state.selectedReactComponentIndex,
      collapsedComponentIds: state.collapsedComponentIds,
      updatedComponentIds: state.updatedComponentIds,
      lastReactListRenderSignature: state.lastReactListRenderSignature,
    }),
    writeListRenderState(update) {
      writeListRenderStateUpdate(state, update);
    },
    writeResetState(update) {
      writeResetStateUpdate(state, update);
    },
    readApplyResultState: () => ({
      reactComponents: state.reactComponents,
      selectedReactComponentIndex: state.selectedReactComponentIndex,
      collapsedComponentIds: state.collapsedComponentIds,
    }),
    writeApplyResultState(update) {
      writeApplyResultStateUpdate(state, update);
    },
  };
}
