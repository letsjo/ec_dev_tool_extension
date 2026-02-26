import { installPageAgentRuntimeFlow } from './pageAgentRuntimeInstallFlow';
import type { InstallPageAgentRuntimeOptions } from './pageAgentRuntimeInstallFlow';

/**
 * main world entry에서 사용하는 pageAgent runtime 설치 진입점.
 * 실제 bridge/install 결선은 runtime install flow 모듈로 위임한다.
 */
function installPageAgentRuntime(
  runtimeWindow: Window,
  options?: InstallPageAgentRuntimeOptions,
): void {
  installPageAgentRuntimeFlow(runtimeWindow, options);
}

export { installPageAgentRuntime };
