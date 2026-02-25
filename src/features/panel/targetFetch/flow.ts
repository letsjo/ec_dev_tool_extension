import { TARGETS } from '../../../config';
import type { CallInspectedPageAgent } from '../bridge/pageAgentClient';

interface CreateTargetFetchFlowOptions {
  getTargetSelectEl: () => HTMLSelectElement | null;
  getFetchBtnEl: () => HTMLButtonElement | null;
  setOutput: (text: string, isError?: boolean) => void;
  callInspectedPageAgent: CallInspectedPageAgent;
}

function safeStringify(value: unknown): string {
  const seen = new WeakSet();
  return JSON.stringify(
    value,
    (_, nextValue) => {
      if (nextValue === undefined) return '[undefined]';
      if (typeof nextValue === 'function') return '[Function]';
      if (typeof nextValue === 'symbol') return String(nextValue);
      if (nextValue !== null && typeof nextValue === 'object') {
        if (seen.has(nextValue)) return '[Circular]';
        seen.add(nextValue);
      }
      return nextValue;
    },
    2,
  );
}

function renderFetchResult(result: unknown): string {
  if (result == null) return '결과 없음';
  if (typeof result === 'object' && 'error' in result) {
    return `오류: ${(result as { error: string }).error}`;
  }
  return safeStringify(result);
}

/**
 * Raw target fetch UI의 목록 채우기/요청 실행 흐름을 조립한다.
 * controller는 DOM ref getter와 bridge caller만 주입한다.
 */
export function createTargetFetchFlow(options: CreateTargetFetchFlowOptions) {
  function populateTargetSelect() {
    const selectEl = options.getTargetSelectEl();
    if (!selectEl) return;
    selectEl.innerHTML = '';
    TARGETS.forEach((target, index) => {
      const option = document.createElement('option');
      option.value = String(index);
      option.textContent = `${target.label} (${target.path})`;
      selectEl.appendChild(option);
    });
  }

  function onFetch() {
    const selectEl = options.getTargetSelectEl();
    const fetchEl = options.getFetchBtnEl();
    if (!selectEl || !fetchEl) {
      options.setOutput('데이터 가져오기 UI가 비활성화되어 있습니다.', true);
      return;
    }

    const index = parseInt(selectEl.value, 10);
    const target = TARGETS[index];
    if (!target) {
      options.setOutput('대상을 선택해 주세요.', true);
      return;
    }

    fetchEl.disabled = true;
    options.setOutput('호출 중…');
    options.callInspectedPageAgent(
      'fetchTargetData',
      {
        targetPath: target.path,
        methods: target.methods ?? [],
        autoDiscoverZeroArgMethods: target.autoDiscoverZeroArgMethods === true,
      },
      (response, errorText) => {
        fetchEl.disabled = false;
        if (errorText) {
          options.setOutput(`실행 오류: ${errorText}`, true);
          return;
        }
        options.setOutput(
          renderFetchResult(response),
          !!(response && typeof response === 'object' && 'error' in response),
        );
      },
    );
  }

  return {
    populateTargetSelect,
    onFetch,
  };
}
