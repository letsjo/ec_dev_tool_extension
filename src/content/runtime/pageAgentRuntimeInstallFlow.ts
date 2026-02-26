import { installPageAgentBridge } from '../pageAgentBridge';
import { createPageAgentRuntimeMethodExecutor } from '../pageAgentRuntimeBootstrap';
import { createDefaultPageAgentRuntimeMethodExecutorOptions } from './pageAgentRuntimeConfig';

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

/** pageAgent runtime bridge 설치 흐름을 구성한다. */
function installPageAgentRuntimeFlow(
  runtimeWindow: Window,
  options: InstallPageAgentRuntimeOptions = DEFAULT_OPTIONS,
) {
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

export { installPageAgentRuntimeFlow };
export type { InstallPageAgentRuntimeOptions };
