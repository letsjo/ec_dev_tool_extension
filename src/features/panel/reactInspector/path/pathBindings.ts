import type { CallInspectedPageAgent } from '../../bridge/pageAgentClient';
import type { RuntimeRefreshLookup } from '../lookup';
import { createReactInspectPathActions as createReactInspectPathActionsValue } from './pathActions';
import { createFunctionSourceOpener as createFunctionSourceOpenerValue } from './pathOpenAction';
import { createReactInspectPathRequester as createReactInspectPathRequesterValue } from './pathRequestRunner';

interface CreateReactInspectPathBindingsOptions {
  callInspectedPageAgent: CallInspectedPageAgent;
  getStoredLookup: () => RuntimeRefreshLookup | null;
  setReactStatus: (text: string, isError?: boolean) => void;
}

/**
 * controller 의존성(bridge 호출/lookup getter/status setter)을 받아
 * inspectPath request/open/action 핸들러 체인을 한 번에 조립한다.
 */
export function createReactInspectPathBindings(options: CreateReactInspectPathBindingsOptions) {
  const requestReactInspectPath = createReactInspectPathRequesterValue({
    callInspectedPageAgent: options.callInspectedPageAgent,
    getStoredLookup: options.getStoredLookup,
  });

  const openFunctionInSources = createFunctionSourceOpenerValue({
    setReactStatus: options.setReactStatus,
  });

  return createReactInspectPathActionsValue({
    requestReactInspectPath,
    setReactStatus: options.setReactStatus,
    openFunctionInSources,
  });
}
