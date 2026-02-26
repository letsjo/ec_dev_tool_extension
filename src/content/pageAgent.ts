/**
 * Main world page agent.
 * 엔트리 파일은 설치 중복 방지와 runtime 조립 진입만 담당한다.
 */

import { installPageAgentRuntime } from './pageAgentRuntime';

const PAGE_AGENT_INSTALLED_KEY = '__EC_DEV_TOOL_PAGE_AGENT_INSTALLED__';

type PageAgentRuntimeWindow = Window & {
  [PAGE_AGENT_INSTALLED_KEY]?: boolean;
};

const runtimeWindow = window as PageAgentRuntimeWindow;

if (runtimeWindow[PAGE_AGENT_INSTALLED_KEY]) {
  /** 이미 주입된 경우 재설치를 건너뛴다. */
} else {
  runtimeWindow[PAGE_AGENT_INSTALLED_KEY] = true;
  installPageAgentRuntime(runtimeWindow);
}
