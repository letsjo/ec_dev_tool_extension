import type { CallInspectedPageAgent } from '../../bridge/pageAgentClient';

interface CreateDebugPageAgentCallerOptions {
  appendDebugLog: (eventName: string, payload?: unknown) => void;
  callInspectedPageAgent: CallInspectedPageAgent;
}

interface CreateDebugPaneSettersOptions {
  appendDebugLog: (eventName: string, payload?: unknown) => void;
  setOutput: (text: string, isError?: boolean) => void;
  setElementOutput: (text: string) => void;
  setReactStatus: (text: string, isError?: boolean) => void;
  setDomTreeStatus: (text: string, isError?: boolean) => void;
  setDomTreeEmpty: (text: string) => void;
}

function summarizeDebugPayload(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') return value.length > 260 ? `${value.slice(0, 260)}…` : value;
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (typeof value === 'function') return `[Function ${(value as Function).name || 'anonymous'}]`;

  if (Array.isArray(value)) {
    return {
      type: 'array',
      length: value.length,
    };
  }

  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return {
      type: 'object',
      keys: Object.keys(record).slice(0, 12),
      ok: record.ok,
      error: typeof record.error === 'string' ? record.error : undefined,
    };
  }

  return String(value);
}

/**
 * pageAgent 브리지 호출에 request/response 로그를 붙인다.
 * request id를 여기서 생성해 panel 전체 로그 상관관계를 맞춘다.
 */
export function createDebugPageAgentCaller({
  appendDebugLog,
  callInspectedPageAgent,
}: CreateDebugPageAgentCallerOptions): CallInspectedPageAgent {
  let pageAgentRequestIdSeq = 0;

  return (method, args, onDone) => {
    const requestId = pageAgentRequestIdSeq + 1;
    pageAgentRequestIdSeq = requestId;
    appendDebugLog('pageAgent.request', {
      requestId,
      method,
      args: summarizeDebugPayload(args),
    });
    callInspectedPageAgent(method, args, (result, errorText) => {
      appendDebugLog('pageAgent.response', {
        requestId,
        method,
        hasError: Boolean(errorText),
        errorText: errorText ?? null,
        result: summarizeDebugPayload(result),
      });
      onDone(result, errorText);
    });
  };
}

/** pane setter 호출을 debug event로 기록하는 래퍼 집합을 만든다. */
export function createDebugPaneSetters({
  appendDebugLog,
  setOutput,
  setElementOutput,
  setReactStatus,
  setDomTreeStatus,
  setDomTreeEmpty,
}: CreateDebugPaneSettersOptions) {
  return {
    setOutputWithDebug: (text: string, isError?: boolean) => {
      appendDebugLog('pane.rawResult.update', { isError: isError === true, text });
      setOutput(text, isError);
    },
    setElementOutputWithDebug: (text: string) => {
      appendDebugLog('pane.selectedElement.update', { text });
      setElementOutput(text);
    },
    setReactStatusWithDebug: (text: string, isError?: boolean) => {
      appendDebugLog('pane.reactStatus.update', { isError: isError === true, text });
      setReactStatus(text, isError);
    },
    setDomTreeStatusWithDebug: (text: string, isError?: boolean) => {
      appendDebugLog('pane.domTreeStatus.update', { isError: isError === true, text });
      setDomTreeStatus(text, isError);
    },
    setDomTreeEmptyWithDebug: (text: string) => {
      appendDebugLog('pane.domTreeBody.update', { text });
      setDomTreeEmpty(text);
    },
  };
}
