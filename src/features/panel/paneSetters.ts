import {
  setPaneEmptyState as setPaneEmptyStateValue,
  setPaneText as setPaneTextValue,
  setPaneTextWithErrorState as setPaneTextWithErrorStateValue,
} from './paneState';

export interface CreatePanelPaneSettersOptions {
  getOutputEl: () => HTMLDivElement;
  getElementOutputEl: () => HTMLDivElement;
  getReactStatusEl: () => HTMLDivElement;
  getReactComponentListEl: () => HTMLDivElement;
  getReactComponentDetailEl: () => HTMLDivElement;
  getDomTreeStatusEl: () => HTMLDivElement;
  getDomTreeOutputEl: () => HTMLDivElement;
  setLastReactListRenderSignature: (signature: string) => void;
  setLastReactDetailRenderSignature: (signature: string) => void;
  setLastReactDetailComponentId: (componentId: string | null) => void;
}

/** panel의 output/react/dom pane 텍스트/empty/error setter를 조립한다. */
export function createPanelPaneSetters(options: CreatePanelPaneSettersOptions) {
  /** UI 상태 또는 문구를 설정 */
  function setOutput(text: string, isError = false) {
    setPaneTextWithErrorStateValue(options.getOutputEl(), text, isError);
  }

  /** UI 상태 또는 문구를 설정 */
  function setElementOutput(text: string) {
    setPaneTextValue(options.getElementOutputEl(), text);
  }

  /** UI 상태 또는 문구를 설정 */
  function setReactStatus(text: string, isError = false) {
    setPaneTextWithErrorStateValue(options.getReactStatusEl(), text, isError);
  }

  /** UI 상태 또는 문구를 설정 */
  function setReactListEmpty(text: string) {
    options.setLastReactListRenderSignature(
      setPaneEmptyStateValue(options.getReactComponentListEl(), text),
    );
  }

  /** UI 상태 또는 문구를 설정 */
  function setReactDetailEmpty(text: string) {
    options.setLastReactDetailRenderSignature(
      setPaneEmptyStateValue(options.getReactComponentDetailEl(), text),
    );
    options.setLastReactDetailComponentId(null);
  }

  /** UI 상태 또는 문구를 설정 */
  function setDomTreeStatus(text: string, isError = false) {
    setPaneTextWithErrorStateValue(options.getDomTreeStatusEl(), text, isError);
  }

  /** UI 상태 또는 문구를 설정 */
  function setDomTreeEmpty(text: string) {
    setPaneTextValue(options.getDomTreeOutputEl(), text);
  }

  return {
    setOutput,
    setElementOutput,
    setReactStatus,
    setReactListEmpty,
    setReactDetailEmpty,
    setDomTreeStatus,
    setDomTreeEmpty,
  };
}
