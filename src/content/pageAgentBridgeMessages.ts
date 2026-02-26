interface BridgeRequestMessage {
  requestId: string;
  method: unknown;
  args: unknown;
}

interface ReadBridgeRequestOptions {
  bridgeSource: string;
  requestAction: string;
}

/** bridge request payload를 검증하고 실행 가능한 최소 필드(requestId/method/args)를 추출한다. */
function readBridgeRequestMessage(
  data: unknown,
  options: ReadBridgeRequestOptions,
): BridgeRequestMessage | null {
  if (!data || typeof data !== 'object') return null;

  const record = data as Record<string, unknown>;
  if (record.source !== options.bridgeSource || record.action !== options.requestAction) {
    return null;
  }
  if (typeof record.requestId !== 'string' || !record.requestId) return null;

  return {
    requestId: record.requestId,
    method: record.method,
    args: record.args,
  };
}

/** bridge 응답 payload(result/error)를 공통 포맷으로 전송한다. */
function postBridgeResponse(
  bridgeSource: string,
  responseAction: string,
  requestId: string,
  ok: boolean,
  payload: Record<string, unknown>,
) {
  window.postMessage(
    {
      source: bridgeSource,
      action: responseAction,
      requestId,
      ok,
      ...payload,
    },
    '*',
  );
}

export { readBridgeRequestMessage, postBridgeResponse };
export type { BridgeRequestMessage, ReadBridgeRequestOptions };
