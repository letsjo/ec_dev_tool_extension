import {
  callInspectedPageAgent as callInspectedPageAgentValue,
  type CallInspectedPageAgent,
} from '../../bridge/pageAgentClient';
import type { PanelControllerContext } from '../context';
import type { ReactInspectorControllerState } from '../../reactInspector/controllerState';
import { createPanelPaneSetters as createPanelPaneSettersValue } from '../../paneSetters';
import {
  createDebugPageAgentCaller as createDebugPageAgentCallerValue,
  createDebugPaneSetters as createDebugPaneSettersValue,
} from './controllerWiringDebug';

interface CreateControllerWiringPaneOptions {
  panelControllerContext: PanelControllerContext;
  reactInspectorState: ReactInspectorControllerState;
  appendDebugLog: (eventName: string, payload?: unknown) => void;
}

interface ControllerWiringPaneDependencies {
  callInspectedPageAgent: CallInspectedPageAgent;
  createPanelPaneSetters: typeof createPanelPaneSettersValue;
  createDebugPageAgentCaller: typeof createDebugPageAgentCallerValue;
  createDebugPaneSetters: typeof createDebugPaneSettersValue;
}

interface ControllerWiringPaneBindings {
  callInspectedPageAgentWithDebug: CallInspectedPageAgent;
  setOutputWithDebug: (text: string, isError?: boolean) => void;
  setElementOutputWithDebug: (text: string) => void;
  setReactStatusWithDebug: (text: string, isError?: boolean) => void;
  setDomTreeStatusWithDebug: (text: string, isError?: boolean) => void;
  setDomTreeEmptyWithDebug: (text: string) => void;
  setReactListEmpty: (text: string) => void;
  setReactDetailEmpty: (text: string) => void;
}

const DEFAULT_DEPS: ControllerWiringPaneDependencies = {
  callInspectedPageAgent: callInspectedPageAgentValue,
  createPanelPaneSetters: createPanelPaneSettersValue,
  createDebugPageAgentCaller: createDebugPageAgentCallerValue,
  createDebugPaneSetters: createDebugPaneSettersValue,
};

/**
 * pane setter + debug 래퍼 결선을 조립해 controllerWiring의 상태/UI 결선 책임을 분리한다.
 * 반환값은 data/react/lifecycle wiring 모듈에서 공통으로 재사용한다.
 */
export function createControllerWiringPaneBindings(
  options: CreateControllerWiringPaneOptions,
  deps: ControllerWiringPaneDependencies = DEFAULT_DEPS,
): ControllerWiringPaneBindings {
  const {
    setOutput,
    setElementOutput,
    setReactStatus,
    setReactListEmpty,
    setReactDetailEmpty,
    setDomTreeStatus,
    setDomTreeEmpty,
  } = deps.createPanelPaneSetters({
    getOutputEl: options.panelControllerContext.getOutputEl,
    getElementOutputEl: options.panelControllerContext.getElementOutputEl,
    getReactStatusEl: options.panelControllerContext.getReactStatusEl,
    getReactComponentListEl: options.panelControllerContext.getReactComponentListEl,
    getReactComponentDetailEl: options.panelControllerContext.getReactComponentDetailEl,
    getDomTreeStatusEl: options.panelControllerContext.getDomTreeStatusEl,
    getDomTreeOutputEl: options.panelControllerContext.getDomTreeOutputEl,
    setLastReactListRenderSignature: options.reactInspectorState.setLastReactListRenderSignature,
    setLastReactDetailRenderSignature:
      options.reactInspectorState.setLastReactDetailRenderSignature,
    setLastReactDetailComponentId: options.reactInspectorState.setLastReactDetailComponentId,
  });

  const callInspectedPageAgentWithDebug = deps.createDebugPageAgentCaller({
    appendDebugLog: options.appendDebugLog,
    callInspectedPageAgent: deps.callInspectedPageAgent,
  });

  const {
    setOutputWithDebug,
    setElementOutputWithDebug,
    setReactStatusWithDebug,
    setDomTreeStatusWithDebug,
    setDomTreeEmptyWithDebug,
  } = deps.createDebugPaneSetters({
    appendDebugLog: options.appendDebugLog,
    setOutput,
    setElementOutput,
    setReactStatus,
    setDomTreeStatus,
    setDomTreeEmpty,
  });

  return {
    callInspectedPageAgentWithDebug,
    setOutputWithDebug,
    setElementOutputWithDebug,
    setReactStatusWithDebug,
    setDomTreeStatusWithDebug,
    setDomTreeEmptyWithDebug,
    setReactListEmpty,
    setReactDetailEmpty,
  };
}

export type {
  CreateControllerWiringPaneOptions,
  ControllerWiringPaneDependencies,
  ControllerWiringPaneBindings,
};
