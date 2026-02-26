import { bindPanelBootstrapEvents as bindPanelBootstrapEventsValue } from './bootstrapEventBindings';

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

interface PanelBootstrapFlowDependencies {
  bindPanelBootstrapEvents: typeof bindPanelBootstrapEventsValue;
}

const PANEL_BOOTSTRAP_FLOW_DEFAULT_DEPS: PanelBootstrapFlowDependencies = {
  bindPanelBootstrapEvents: bindPanelBootstrapEventsValue,
};

/**
 * 패널 부트스트랩 순서(마운트 -> DOM ref -> 초기 문구 -> 이벤트 바인딩)를 고정한다.
 * controller는 실제 부수효과 구현을 주입하고 이 흐름을 호출만 한다.
 */
export function createPanelBootstrapFlow(
  options: CreatePanelBootstrapFlowOptions,
  deps: PanelBootstrapFlowDependencies = PANEL_BOOTSTRAP_FLOW_DEFAULT_DEPS,
) {
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

    deps.bindPanelBootstrapEvents({
      getFetchBtnEl: options.getFetchBtnEl,
      getSelectElementBtnEl: options.getSelectElementBtnEl,
      getPayloadModeBtnEl: options.getPayloadModeBtnEl,
      getComponentSearchInputEl: options.getComponentSearchInputEl,
      getReactComponentListEl: options.getReactComponentListEl,
      onFetch: options.onFetch,
      onSelectElement: options.onSelectElement,
      onTogglePayloadMode: options.onTogglePayloadMode,
      onComponentSearchInput: options.onComponentSearchInput,
      clearPageHoverPreview: options.clearPageHoverPreview,
      onBeforeUnload: options.onBeforeUnload,
    });
    options.addNavigatedListener();
    options.runInitialRefresh();
  }

  return {
    bootstrapPanel,
  };
}
