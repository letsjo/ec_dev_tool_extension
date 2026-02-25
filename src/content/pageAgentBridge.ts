// @ts-nocheck
type AnyRecord = Record<string, any>;

type ExecuteMethodHandler = (method: string, args: unknown) => unknown;

interface InstallPageAgentBridgeOptions {
  bridgeSource: string;
  requestAction: string;
  responseAction: string;
  executeMethod: ExecuteMethodHandler;
}

/** 브리지 응답/메시지를 전송 */
function postBridgeResponse(
  bridgeSource: string,
  responseAction: string,
  requestId: string,
  ok: boolean,
  payload: AnyRecord,
) {
  window.postMessage(
    {
      source: bridgeSource,
      action: responseAction,
      requestId,
      ok,
      ...payload,
    },
    "*",
  );
}

/** pageAgent 브리지 request 리스너를 설치한다. */
export function installPageAgentBridge(options: InstallPageAgentBridgeOptions) {
  const bridgeSource = options.bridgeSource;
  const requestAction = options.requestAction;
  const responseAction = options.responseAction;
  const executeMethod = options.executeMethod;

  /** 이벤트를 처리 */
  const onBridgeMessage = (event: MessageEvent) => {
    if (event.source !== window) return;
    const data = event.data;
    if (!data || typeof data !== "object") return;
    if (data.source !== bridgeSource || data.action !== requestAction) return;
    if (typeof data.requestId !== "string" || !data.requestId) return;

    try {
      const result = executeMethod(data.method, data.args);
      postBridgeResponse(bridgeSource, responseAction, data.requestId, true, { result });
    } catch (error) {
      postBridgeResponse(bridgeSource, responseAction, data.requestId, false, {
        error: String(error && error.message ? error.message : error),
      });
    }
  };

  window.addEventListener("message", onBridgeMessage);
  return () => {
    window.removeEventListener("message", onBridgeMessage);
  };
}
