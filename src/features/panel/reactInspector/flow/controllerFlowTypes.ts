import type { ReactComponentInfo } from '../../../../shared/inspector';
import type { CallInspectedPageAgent } from '../../bridge/pageAgentClient';
import type {
  FetchSerializedValueAtPathHandler,
  InspectFunctionAtPathHandler,
} from '../jsonRenderTypes';
import type { ReactInspectorControllerState } from '../controllerState';

export interface CreateReactInspectorControllerFlowsOptions {
  state: ReactInspectorControllerState;
  callInspectedPageAgent: CallInspectedPageAgent;
  getReactComponentListEl: () => HTMLDivElement;
  getTreePaneEl: () => HTMLDivElement;
  getReactComponentDetailEl: () => HTMLDivElement;
  getComponentSearchInputEl: () => HTMLInputElement;
  setReactStatus: (text: string, isError?: boolean) => void;
  setReactListEmpty: (text: string) => void;
  setReactDetailEmpty: (text: string) => void;
  clearPageHoverPreview: () => void;
  clearPageComponentHighlight: () => void;
  previewPageDomForComponent: (component: ReactComponentInfo) => void;
  highlightPageDomForComponent: (component: ReactComponentInfo) => void;
  setDomTreeStatus: (text: string, isError?: boolean) => void;
  setDomTreeEmpty: (text: string) => void;
  inspectFunctionAtPath: InspectFunctionAtPathHandler;
  fetchSerializedValueAtPath: FetchSerializedValueAtPathHandler;
  detailFetchRetryCooldownMs: number;
  appendDebugLog?: (eventName: string, payload?: unknown) => void;
}

export interface ReactInspectorPaneSetters {
  setReactStatus: (text: string, isError?: boolean) => void;
  setReactListEmpty: (text: string) => void;
  setReactDetailEmpty: (text: string) => void;
}
