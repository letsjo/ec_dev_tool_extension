interface BindPanelBootstrapEventsOptions {
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
  onBeforeUnload: () => void;
}

/**
 * bootstrap 직후 필요한 panel DOM 이벤트를 결선한다.
 * 실제 동작은 상위 flow에서 주입하고, 이 모듈은 바인딩 순서와 대상만 고정한다.
 */
export function bindPanelBootstrapEvents(options: BindPanelBootstrapEventsOptions) {
  const fetchBtnEl = options.getFetchBtnEl();
  if (fetchBtnEl) {
    fetchBtnEl.addEventListener('click', options.onFetch);
  }

  options.getSelectElementBtnEl().addEventListener('click', options.onSelectElement);
  options.getPayloadModeBtnEl().addEventListener('click', options.onTogglePayloadMode);
  options.getComponentSearchInputEl().addEventListener('input', options.onComponentSearchInput);
  options.getReactComponentListEl().addEventListener('mouseleave', options.clearPageHoverPreview);
  window.addEventListener('beforeunload', options.onBeforeUnload);
}

export type { BindPanelBootstrapEventsOptions };
