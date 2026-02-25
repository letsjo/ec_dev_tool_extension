import { isPageHighlightResult } from '../../../shared/inspector/guards';
import type { ReactComponentInfo } from '../../../shared/inspector/types';

type CallInspectedPageAgent = (
  method: string,
  args: unknown,
  onDone: (result: unknown | null, errorText?: string) => void,
) => void;

interface CreatePanelSelectionSyncHandlersOptions {
  callInspectedPageAgent: CallInspectedPageAgent;
  setReactStatus: (text: string, isError?: boolean) => void;
  setElementOutput: (text: string) => void;
  setDomTreeStatus: (text: string, isError?: boolean) => void;
  setDomTreeEmpty: (text: string) => void;
  fetchDomTree: (selector: string) => void;
}

/** component 선택 시 pageAgent 기반 DOM 동기화 핸들러를 구성한다. */
export function createPanelSelectionSyncHandlers(
  options: CreatePanelSelectionSyncHandlersOptions,
) {
  const {
    callInspectedPageAgent,
    setReactStatus,
    setElementOutput,
    setDomTreeStatus,
    setDomTreeEmpty,
    fetchDomTree,
  } = options;

  /** 기존 상태를 정리 */
  function clearPageComponentHighlight() {
    callInspectedPageAgent('clearComponentHighlight', null, () => {
      /** 동작 없음. */
    });
  }

  /** 기존 상태를 정리 */
  function clearPageHoverPreview() {
    callInspectedPageAgent('clearHoverPreview', null, () => {
      /** 동작 없음. */
    });
  }

  /** 해당 기능 흐름을 처리 */
  function previewPageDomForComponent(component: ReactComponentInfo) {
    if (!component.domSelector) return;
    callInspectedPageAgent('previewComponent', { selector: component.domSelector }, () => {
      /** 동작 없음. */
    });
  }

  /** UI 상태 또는 문구를 설정 */
  function setElementOutputFromHighlightResult(
    result: {
      tagName?: string;
      selector?: string;
      domPath?: string;
      rect?: Record<string, unknown>;
    },
    fallback: ReactComponentInfo,
  ) {
    const lines = [
      `tagName: ${result.tagName ?? fallback.domTagName ?? ''}`,
      `selector: ${result.selector ?? fallback.domSelector ?? ''}`,
      `domPath: ${result.domPath ?? fallback.domPath ?? ''}`,
      result.rect ? `rect: ${JSON.stringify(result.rect)}` : null,
    ].filter(Boolean);
    setElementOutput(lines.join('\n'));
  }

  /**
   * 선택 컴포넌트의 DOM 하이라이트 결과를 기준으로
   * Selected Element/DOM Path/DOM Tree 패널을 함께 동기화한다.
   */
  function highlightPageDomForComponent(component: ReactComponentInfo) {
    if (!component.domSelector) {
      clearPageComponentHighlight();
      setReactStatus(`선택한 컴포넌트(${component.name})는 연결된 DOM 요소가 없습니다.`);
      setElementOutput(`component: ${component.name}\nDOM 매핑 없음`);
      setDomTreeStatus('선택한 컴포넌트에 연결된 DOM 요소가 없습니다.', true);
      setDomTreeEmpty('표시할 DOM이 없습니다.');
      return;
    }

    callInspectedPageAgent(
      'highlightComponent',
      { selector: component.domSelector },
      (res, errorText) => {
        if (errorText) {
          setReactStatus(`DOM 하이라이트 실행 오류: ${errorText}`, true);
          return;
        }
        if (!isPageHighlightResult(res) || !res.ok) {
          const reason = isPageHighlightResult(res) ? res.error : '알 수 없는 오류';
          setReactStatus(`DOM 하이라이트 실패: ${reason ?? '알 수 없는 오류'}`, true);
          setDomTreeStatus(`DOM 하이라이트 실패: ${reason ?? '알 수 없는 오류'}`, true);
          setDomTreeEmpty('표시할 DOM이 없습니다.');
          return;
        }

        setReactStatus(`컴포넌트 ${component.name} DOM 하이라이트 완료`);
        setElementOutputFromHighlightResult(res, component);
        fetchDomTree(res.selector ?? component.domSelector ?? '');
      },
    );
  }

  return {
    clearPageComponentHighlight,
    clearPageHoverPreview,
    previewPageDomForComponent,
    highlightPageDomForComponent,
  };
}
