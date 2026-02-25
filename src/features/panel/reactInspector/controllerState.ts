import type { ReactComponentInfo } from '../../../shared/inspector/types';
import type { RuntimeRefreshLookup } from './lookup';

interface ReactComponentDetailRenderStateUpdate {
  lastReactDetailComponentId: string | null;
  lastReactDetailRenderSignature: string;
}

interface ReactComponentListRenderStateUpdate {
  updatedComponentIds?: Set<string>;
  lastReactListRenderSignature?: string;
}

interface ReactInspectorResetStateUpdate {
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

interface ReactInspectApplyStateUpdate {
  reactComponents?: ReactComponentInfo[];
  selectedReactComponentIndex?: number;
  componentSearchIncludeDataTokens?: boolean;
  componentSearchTexts?: string[];
  collapsedComponentIds?: Set<string>;
  updatedComponentIds?: Set<string>;
}

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
  let reactComponents: ReactComponentInfo[] = [];
  let selectedReactComponentIndex = -1;
  let storedLookup: RuntimeRefreshLookup | null = null;
  let componentSearchQuery = '';
  let componentSearchTexts: string[] = [];
  let componentSearchIncludeDataTokens = true;
  let collapsedComponentIds = new Set<string>();
  let lastReactListRenderSignature = '';
  let lastReactDetailRenderSignature = '';
  let lastReactDetailComponentId: string | null = null;
  let updatedComponentIds = new Set<string>();

  function writeListRenderState(update: ReactComponentListRenderStateUpdate) {
    if (update.updatedComponentIds) {
      updatedComponentIds = update.updatedComponentIds;
    }
    if (typeof update.lastReactListRenderSignature === 'string') {
      lastReactListRenderSignature = update.lastReactListRenderSignature;
    }
  }

  function writeApplyResultState(update: ReactInspectApplyStateUpdate) {
    if (update.reactComponents) {
      reactComponents = update.reactComponents;
    }
    if (update.updatedComponentIds) {
      updatedComponentIds = update.updatedComponentIds;
    }
    if (typeof update.componentSearchIncludeDataTokens === 'boolean') {
      componentSearchIncludeDataTokens = update.componentSearchIncludeDataTokens;
    }
    if (update.componentSearchTexts) {
      componentSearchTexts = update.componentSearchTexts;
    }
    if (update.collapsedComponentIds) {
      collapsedComponentIds = update.collapsedComponentIds;
    }
    if (typeof update.selectedReactComponentIndex === 'number') {
      selectedReactComponentIndex = update.selectedReactComponentIndex;
    }
  }

  return {
    getReactComponents: () => reactComponents,
    setReactComponents(value) {
      reactComponents = value;
    },
    getSelectedReactComponentIndex: () => selectedReactComponentIndex,
    setSelectedReactComponentIndex(value) {
      selectedReactComponentIndex = value;
    },
    getStoredLookup: () => storedLookup,
    setStoredLookup(value) {
      storedLookup = value;
    },
    getComponentSearchQuery: () => componentSearchQuery,
    setComponentSearchQuery(value) {
      componentSearchQuery = value;
    },
    getComponentSearchTexts: () => componentSearchTexts,
    setComponentSearchTexts(value) {
      componentSearchTexts = value;
    },
    getComponentSearchIncludeDataTokens: () => componentSearchIncludeDataTokens,
    setComponentSearchIncludeDataTokens(value) {
      componentSearchIncludeDataTokens = value;
    },
    getCollapsedComponentIds: () => collapsedComponentIds,
    setCollapsedComponentIds(value) {
      collapsedComponentIds = value;
    },
    getLastReactListRenderSignature: () => lastReactListRenderSignature,
    setLastReactListRenderSignature(value) {
      lastReactListRenderSignature = value;
    },
    getLastReactDetailRenderSignature: () => lastReactDetailRenderSignature,
    setLastReactDetailRenderSignature(value) {
      lastReactDetailRenderSignature = value;
    },
    getLastReactDetailComponentId: () => lastReactDetailComponentId,
    setLastReactDetailComponentId(value) {
      lastReactDetailComponentId = value;
    },
    getUpdatedComponentIds: () => updatedComponentIds,
    setUpdatedComponentIds(value) {
      updatedComponentIds = value;
    },
    readDetailRenderState: () => ({
      lastReactDetailComponentId,
      lastReactDetailRenderSignature,
    }),
    writeDetailRenderState(update) {
      lastReactDetailComponentId = update.lastReactDetailComponentId;
      lastReactDetailRenderSignature = update.lastReactDetailRenderSignature;
    },
    readListRenderState: () => ({
      reactComponents,
      componentSearchQuery,
      selectedReactComponentIndex,
      collapsedComponentIds,
      updatedComponentIds,
      lastReactListRenderSignature,
    }),
    writeListRenderState,
    writeResetState(update) {
      reactComponents = update.reactComponents;
      componentSearchTexts = update.componentSearchTexts;
      componentSearchIncludeDataTokens = update.componentSearchIncludeDataTokens;
      collapsedComponentIds = update.collapsedComponentIds;
      updatedComponentIds = update.updatedComponentIds;
      selectedReactComponentIndex = update.selectedReactComponentIndex;
      lastReactListRenderSignature = update.lastReactListRenderSignature;
      lastReactDetailRenderSignature = update.lastReactDetailRenderSignature;
      lastReactDetailComponentId = update.lastReactDetailComponentId;
    },
    readApplyResultState: () => ({
      reactComponents,
      selectedReactComponentIndex,
      collapsedComponentIds,
    }),
    writeApplyResultState,
  };
}
