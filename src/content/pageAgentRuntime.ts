import { installPageAgentBridge } from './pageAgentBridge';
import { createPageAgentRuntimeMethodExecutor } from './pageAgentRuntimeBootstrap';
import { createDefaultPageAgentRuntimeMethodExecutorOptions } from './runtime/pageAgentRuntimeConfig';

interface InstallPageAgentRuntimeOptions {
  bridgeSource: string;
  requestAction: string;
  responseAction: string;
}

const DEFAULT_OPTIONS: InstallPageAgentRuntimeOptions = {
  bridgeSource: 'EC_DEV_TOOL_PAGE_AGENT_BRIDGE',
  requestAction: 'request',
  responseAction: 'response',
};

/** pageAgent 도메인 핸들러를 조립하고 bridge request handler를 설치한다. */
function installPageAgentRuntime(
  runtimeWindow: Window,
  options: InstallPageAgentRuntimeOptions = DEFAULT_OPTIONS,
): void {
  const executeMethod = createPageAgentRuntimeMethodExecutor(
    createDefaultPageAgentRuntimeMethodExecutorOptions(runtimeWindow),
  );

  installPageAgentBridge({
    bridgeSource: options.bridgeSource,
    requestAction: options.requestAction,
    responseAction: options.responseAction,
    executeMethod,
  });
}

export { installPageAgentRuntime };
