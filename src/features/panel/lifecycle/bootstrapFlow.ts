interface CreatePanelBootstrapFlowOptions {
  mountPanelView: () => void;
  initDomRefs: () => void;
  initializeWorkspaceLayout: () => void;
  initializeWheelFallback: () => void;
  setPickerModeActive: (active: boolean) => void;
  populateTargetSelect: () => void;
  setElementOutput: (text: string) => void;
  setDomTreeStatus: (text: string, isError?: boolean) => void;
  setDomTreeEmpty: (text: string) => void;
  getFetchBtnEl: () => HTMLButtonElement | null;
  getSelectElementBtnEl: () => HTMLButtonElement;
  getPayloadModeBtnEl: () => HTMLButtonElement;
  getComponentSearchInputEl: () => HTMLInputElement;
  getReactComponentListEl: () => HTMLDivElement;
  onFetch: () => void;
  onSelectElement: () => void;
  onTogglePayloadMode: () => void;
  onComponentSearchInput: () => void;
  clearPageHoverPreview: () => void;
  addNavigatedListener: () => void;
  onBeforeUnload: () => void;
  runInitialRefresh: () => void;
}

/**
 * 패널 부트스트랩 순서(마운트 -> DOM ref -> 초기 문구 -> 이벤트 바인딩)를 고정한다.
 * controller는 실제 부수효과 구현을 주입하고 이 흐름을 호출만 한다.
 */
export function createPanelBootstrapFlow(options: CreatePanelBootstrapFlowOptions) {
  function bootstrapPanel() {
    options.mountPanelView();
    options.initDomRefs();
    options.initializeWorkspaceLayout();
    options.initializeWheelFallback();

    options.setPickerModeActive(false);
    options.populateTargetSelect();
    options.setElementOutput('런타임 트리를 자동으로 불러오는 중입니다.');
    options.setDomTreeStatus('요소를 선택하면 DOM 트리를 표시합니다.');
    options.setDomTreeEmpty('요소를 선택하면 DOM 트리를 표시합니다.');

    const fetchBtnEl = options.getFetchBtnEl();
    if (fetchBtnEl) {
      fetchBtnEl.addEventListener('click', options.onFetch);
    }
    options.getSelectElementBtnEl().addEventListener('click', options.onSelectElement);
    options.getPayloadModeBtnEl().addEventListener('click', options.onTogglePayloadMode);
    options
      .getComponentSearchInputEl()
      .addEventListener('input', options.onComponentSearchInput);
    options.getReactComponentListEl().addEventListener('mouseleave', () => {
      options.clearPageHoverPreview();
    });

    options.addNavigatedListener();
    window.addEventListener('beforeunload', options.onBeforeUnload);
    options.runInitialRefresh();
  }

  return {
    bootstrapPanel,
  };
}
