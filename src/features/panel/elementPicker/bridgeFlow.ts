import { isPickPoint } from '../../../shared/inspector';
import { readString } from '../../../shared/readers';
import type {
  ElementInfo,
  ElementSelectedMessage,
  PickPoint,
  PickerStartResponse,
} from '../../../shared/inspector';

interface CreateElementPickerBridgeFlowOptions {
  getInspectedTabId: () => number;
  clearPageHoverPreview: () => void;
  setPickerModeActive: (active: boolean) => void;
  setElementOutput: (text: string) => void;
  setReactStatus: (text: string, isError?: boolean) => void;
  setDomTreeStatus: (text: string, isError?: boolean) => void;
  setDomTreeEmpty: (text: string) => void;
  fetchDomTree: (selector: string, pickPoint?: PickPoint, domPath?: string) => void;
  fetchReactInfoForElementSelection: (selector: string, pickPoint?: PickPoint) => void;
  resetRuntimeRefresh: () => void;
  scheduleRuntimeRefresh: () => void;
  appendDebugLog?: (eventName: string, payload?: unknown) => void;
}

interface SelectedElementSnapshot {
  querySelector: string;
  domPath: string;
  clickPoint?: PickPoint;
  outputText: string;
}

function buildSelectedElementSnapshot(elementInfo: ElementInfo): SelectedElementSnapshot {
  const selectorText = readString(elementInfo.selector);
  const domPathText = readString(elementInfo.domPath);
  const tagNameText = readString(elementInfo.tagName);
  const idText = readString(elementInfo.id);
  const classNameText = readString(elementInfo.className);
  const innerText = readString(elementInfo.innerText);
  const clickPoint = isPickPoint(elementInfo.clickPoint) ? elementInfo.clickPoint : undefined;

  const lines = [
    `tagName: ${tagNameText}`,
    `selector: ${selectorText}`,
    `domPath: ${domPathText}`,
    idText ? `id: ${idText}` : null,
    classNameText ? `className: ${classNameText}` : null,
    elementInfo.rect ? `rect: ${JSON.stringify(elementInfo.rect)}` : null,
    innerText ? `innerText: ${innerText.slice(0, 100)}…` : null,
    clickPoint ? `clickPoint: ${JSON.stringify(clickPoint)}` : null,
  ].filter(Boolean);

  return {
    querySelector: selectorText || domPathText,
    domPath: domPathText,
    clickPoint,
    outputText: lines.join('\n'),
  };
}

/**
 * element picker 시작 액션과 runtime 메시지 분기를 한 곳으로 모은다.
 * controller는 의존성만 주입하고, picker 상태/문구 전환 규칙은 이 모듈에서 유지한다.
 */
export function createElementPickerBridgeFlow(options: CreateElementPickerBridgeFlowOptions) {
  function onSelectElement() {
    options.appendDebugLog?.('picker.select.start');
    options.clearPageHoverPreview();
    const tabId = options.getInspectedTabId();
    chrome.runtime.sendMessage(
      { action: 'startElementPicker', tabId },
      (response?: PickerStartResponse) => {
        if (chrome.runtime.lastError) {
          options.appendDebugLog?.('picker.select.error.runtime', {
            message: chrome.runtime.lastError.message ?? 'unknown',
          });
          options.setPickerModeActive(false);
          options.setElementOutput(
            '오류: ' +
              (chrome.runtime.lastError.message ??
                '콘텐츠 스크립트를 불러올 수 없습니다. 페이지를 새로고침한 뒤 다시 시도하세요.'),
          );
          options.setDomTreeStatus('오류: 요소 선택을 시작할 수 없습니다.', true);
          return;
        }
        if (!response?.ok) {
          options.appendDebugLog?.('picker.select.error.response', {
            message: response?.error ?? '요소 선택 시작에 실패했습니다.',
          });
          options.setPickerModeActive(false);
          options.setElementOutput(
            '오류: ' + (response?.error ?? '요소 선택 시작에 실패했습니다.'),
          );
          options.setDomTreeStatus('오류: 요소 선택 시작에 실패했습니다.', true);
          return;
        }

        options.appendDebugLog?.('picker.select.ready');
        options.setPickerModeActive(true);
        options.setElementOutput('페이지에서 요소를 클릭하세요. (취소: Esc)');
        options.setReactStatus('요소 선택 대기 중… 선택 후 컴포넌트 트리를 조회합니다.');
        options.setDomTreeStatus('요소 선택 대기 중…');
        options.setDomTreeEmpty('요소를 클릭하면 DOM 트리를 표시합니다.');
      },
    );
  }

  function onRuntimeMessage(message: ElementSelectedMessage) {
    const inspectedTabId = options.getInspectedTabId();
    options.appendDebugLog?.('picker.runtime.message', {
      action: message.action,
      tabId: message.tabId ?? null,
      currentTabId: inspectedTabId,
    });
    if (message.action === 'elementPickerStopped' && message.tabId === inspectedTabId) {
      options.clearPageHoverPreview();
      options.setPickerModeActive(false);
      if (message.reason === 'cancelled') {
        options.setReactStatus('요소 선택이 취소되었습니다.');
        options.setDomTreeStatus('요소 선택이 취소되었습니다.');
      }
      return;
    }

    if (message.action === 'pageRuntimeChanged' && message.tabId === inspectedTabId) {
      options.scheduleRuntimeRefresh();
      return;
    }

    if (
      message.action === 'elementSelected' &&
      message.elementInfo &&
      message.tabId === inspectedTabId
    ) {
      options.clearPageHoverPreview();
      options.setPickerModeActive(false);
      options.resetRuntimeRefresh();

      const selectedElement = buildSelectedElementSnapshot(message.elementInfo);
      options.appendDebugLog?.('picker.element.selected', {
        querySelector: selectedElement.querySelector,
        domPath: selectedElement.domPath,
        clickPoint: selectedElement.clickPoint ?? null,
      });
      options.setElementOutput(selectedElement.outputText);
      options.fetchDomTree(
        selectedElement.querySelector,
        selectedElement.clickPoint,
        selectedElement.domPath,
      );
      options.fetchReactInfoForElementSelection(
        selectedElement.querySelector,
        selectedElement.clickPoint,
      );
    }
  }

  return {
    onSelectElement,
    onRuntimeMessage,
  };
}
