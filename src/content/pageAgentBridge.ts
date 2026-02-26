// @ts-nocheck
import {
  postBridgeResponse,
  readBridgeRequestMessage,
} from './pageAgentBridgeMessages';

type ExecuteMethodHandler = (method: string, args: unknown) => unknown;

interface InstallPageAgentBridgeOptions {
  bridgeSource: string;
  requestAction: string;
  responseAction: string;
  executeMethod: ExecuteMethodHandler;
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
    const requestMessage = readBridgeRequestMessage(event.data, {
      bridgeSource,
      requestAction,
    });
    if (!requestMessage) return;

    try {
      const result = executeMethod(requestMessage.method as string, requestMessage.args);
      postBridgeResponse(bridgeSource, responseAction, requestMessage.requestId, true, { result });
    } catch (error) {
      postBridgeResponse(bridgeSource, responseAction, requestMessage.requestId, false, {
        error: String(error && error.message ? error.message : error),
      });
    }
  };

  window.addEventListener('message', onBridgeMessage);
  return () => {
    window.removeEventListener('message', onBridgeMessage);
  };
}
