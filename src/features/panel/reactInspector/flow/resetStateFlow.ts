interface ReactInspectorResetStateUpdate {
  reactComponents: [];
  componentSearchTexts: [];
  componentSearchIncludeDataTokens: true;
  collapsedComponentIds: Set<string>;
  updatedComponentIds: Set<string>;
  selectedReactComponentIndex: -1;
  lastReactListRenderSignature: '';
  lastReactDetailRenderSignature: '';
  lastReactDetailComponentId: null;
}

interface CreateReactInspectorResetStateFlowOptions {
  writeState: (update: ReactInspectorResetStateUpdate) => void;
  resetDetailFetchQueue: () => void;
  clearPageHoverPreview: () => void;
  clearPageComponentHighlight: () => void;
  applyResetPaneState: (statusText: string, isError: boolean) => void;
}

/** react inspect 상태/캐시/패널 문구를 초기값으로 되돌리는 reset 흐름을 구성한다. */
export function createReactInspectorResetStateFlow(
  options: CreateReactInspectorResetStateFlowOptions,
) {
  const {
    writeState,
    resetDetailFetchQueue,
    clearPageHoverPreview,
    clearPageComponentHighlight,
    applyResetPaneState,
  } = options;

  return function resetReactInspector(statusText: string, isError = false) {
    writeState({
      reactComponents: [],
      componentSearchTexts: [],
      componentSearchIncludeDataTokens: true,
      collapsedComponentIds: new Set<string>(),
      updatedComponentIds: new Set<string>(),
      selectedReactComponentIndex: -1,
      lastReactListRenderSignature: '',
      lastReactDetailRenderSignature: '',
      lastReactDetailComponentId: null,
    });
    resetDetailFetchQueue();
    clearPageHoverPreview();
    clearPageComponentHighlight();
    applyResetPaneState(statusText, isError);
  };
}
