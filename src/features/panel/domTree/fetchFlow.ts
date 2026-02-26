import { isRecord } from '../../../shared/inspector';
import type { DomTreeEvalResult, PickPoint } from '../../../shared/inspector';
import type { CallInspectedPageAgent } from '../bridge/pageAgentClient';
import { handleDomTreeAgentResponse } from '../pageAgent/responsePipeline';
import { renderDomTreeNode } from './renderer';

interface CreateDomTreeFetchFlowOptions {
  callInspectedPageAgent: CallInspectedPageAgent;
  getDomTreeOutputEl: () => HTMLDivElement;
  setDomTreeStatus: (text: string, isError?: boolean) => void;
  setDomTreeEmpty: (text: string) => void;
  appendDebugLog?: (eventName: string, payload?: unknown) => void;
}

interface ApplyDomTreeResultUiOptions {
  domTreeOutputEl: HTMLDivElement;
  setDomTreeStatus: (text: string, isError?: boolean) => void;
  setDomTreeEmpty: (text: string) => void;
}

function clearDomTreeOutput(domTreeOutputEl: HTMLDivElement) {
  domTreeOutputEl.innerHTML = '';
  domTreeOutputEl.classList.remove('empty');
}

/**
 * page-agent에서 반환한 DOM 트리 결과를 UI에 반영한다.
 * - root가 없으면 상태/본문을 실패 문구로 정리
 * - root가 있으면 기존 DOM 트리를 비우고 새 노드를 렌더
 * - truncation 여부를 status suffix에 반영
 */
function applyDomTreeResult(result: DomTreeEvalResult, options: ApplyDomTreeResultUiOptions) {
  if (!result.root) {
    options.setDomTreeStatus('DOM 트리를 생성하지 못했습니다.', true);
    options.setDomTreeEmpty('표시할 DOM이 없습니다.');
    return;
  }

  clearDomTreeOutput(options.domTreeOutputEl);
  options.domTreeOutputEl.appendChild(renderDomTreeNode(result.root));

  const rawMeta = (result as unknown as Record<string, unknown>).meta;
  const meta = isRecord(rawMeta) ? rawMeta : null;
  const truncatedByBudget = Boolean(meta && meta.truncatedByBudget === true);
  const pathText = typeof result.domPath === 'string' ? result.domPath : '';
  const suffix = truncatedByBudget ? ' (노드가 많아 일부 생략됨)' : '';
  options.setDomTreeStatus(pathText ? `DOM path: ${pathText}${suffix}` : `선택 요소 DOM${suffix}`);
}

/**
 * controller 의존성을 주입받아 DOM 트리 조회 플로우를 조립한다.
 * 호출부는 selector/pickPoint만 전달하고, 상태 반영 규칙은 이 모듈에서 통일한다.
 */
export function createDomTreeFetchFlow(options: CreateDomTreeFetchFlowOptions) {
  let latestRequestId = 0;

  function applyDomTreeResultWithUi(result: DomTreeEvalResult) {
    const domTreeOutputEl = options.getDomTreeOutputEl();
    applyDomTreeResult(result, {
      domTreeOutputEl,
      setDomTreeStatus: options.setDomTreeStatus,
      setDomTreeEmpty: options.setDomTreeEmpty,
    });
  }

  function fetchDomTree(selector: string, pickPoint?: PickPoint, domPath?: string) {
    const requestId = latestRequestId + 1;
    latestRequestId = requestId;
    options.appendDebugLog?.('domTree.fetch.request', {
      requestId,
      selector,
      domPath: domPath ?? '',
      pickPoint: pickPoint ?? null,
    });

    options.setDomTreeStatus('DOM 트리 조회 중…');
    options.setDomTreeEmpty('DOM 트리를 불러오는 중…');

    options.callInspectedPageAgent(
      'getDomTree',
      { selector, pickPoint: pickPoint ?? null, domPath: domPath ?? '' },
      (response, errorText) => {
        // 빠른 연속 선택 시 늦게 도착한 이전 응답이 최신 선택 결과를 덮어쓰지 않도록 막는다.
        if (requestId !== latestRequestId) {
          options.appendDebugLog?.('domTree.fetch.staleDrop', { requestId, latestRequestId });
          return;
        }
        options.appendDebugLog?.('domTree.fetch.response', {
          requestId,
          hasError: Boolean(errorText),
          responseOk: isRecord(response) && response.ok === true,
        });
        handleDomTreeAgentResponse({
          response,
          errorText: errorText ?? undefined,
          setDomTreeStatus: options.setDomTreeStatus,
          setDomTreeEmpty: options.setDomTreeEmpty,
          applyDomTreeResult: applyDomTreeResultWithUi,
        });
      },
    );
  }

  return {
    fetchDomTree,
  };
}
