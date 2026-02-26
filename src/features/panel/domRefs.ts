import React from 'react';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { PanelViewSection } from '../../ui/sections';
import { WORKSPACE_PANEL_IDS, type WorkspacePanelId } from './workspacePanels';

export interface PanelDomRefs {
  outputEl: HTMLDivElement;
  targetSelectEl: HTMLSelectElement | null;
  fetchBtnEl: HTMLButtonElement | null;
  panelWorkspaceEl: HTMLElement;
  panelContentEl: HTMLElement;
  workspacePanelToggleBarEl: HTMLDivElement;
  workspaceDockPreviewEl: HTMLDivElement;
  selectElementBtnEl: HTMLButtonElement;
  componentSearchInputEl: HTMLInputElement;
  payloadModeBtnEl: HTMLButtonElement;
  elementOutputEl: HTMLDivElement;
  domTreeStatusEl: HTMLDivElement;
  domTreeOutputEl: HTMLDivElement;
  reactStatusEl: HTMLDivElement;
  reactComponentListEl: HTMLDivElement;
  treePaneEl: HTMLDivElement;
  reactComponentDetailEl: HTMLDivElement;
  debugDiagnosticsPaneEl: HTMLDivElement;
  debugLogPaneEl: HTMLDivElement;
  debugLogCopyBtnEl: HTMLButtonElement;
  debugLogClearBtnEl: HTMLButtonElement;
  workspacePanelElements: Map<WorkspacePanelId, HTMLDetailsElement>;
}

function getRequiredElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`필수 엘리먼트를 찾을 수 없습니다: #${id}`);
  }
  return element as T;
}

/**
 * 현재 DOM에 렌더된 패널 `<details>`를 id 기준으로 수집한다.
 * 이후 레이아웃 렌더/상태 전환/크기 동기화는 이 맵을 단일 진입점으로 사용한다.
 */
function collectWorkspacePanelElements(): Map<WorkspacePanelId, HTMLDetailsElement> {
  const panelEntries = WORKSPACE_PANEL_IDS.map(
    (panelId) => [panelId, getRequiredElement<HTMLDetailsElement>(panelId)] as const,
  );
  return new Map<WorkspacePanelId, HTMLDetailsElement>(panelEntries);
}

/**
 * React 패널 뷰를 1회 마운트한다.
 * `flushSync`를 쓰는 이유:
 * - 다음 단계(`initPanelDomRefs`)가 바로 DOM query를 수행하므로,
 * - React commit이 완료된 시점을 강제해서 null 참조를 피하기 위해서다.
 */
export function mountPanelView() {
  const rootElement = getRequiredElement<HTMLDivElement>('root');
  const root = createRoot(rootElement);
  flushSync(() => {
    root.render(React.createElement(PanelViewSection));
  });
}

/**
 * 패널 동작에 필요한 주요 DOM 참조를 한 곳에서 초기화한다.
 * 반환된 ref 객체를 기준으로 이후 파이프라인이 결선된다.
 */
export function initPanelDomRefs(): PanelDomRefs {
  return {
    outputEl: getRequiredElement<HTMLDivElement>('output'),
    targetSelectEl: document.getElementById('targetSelect') as HTMLSelectElement | null,
    fetchBtnEl: document.getElementById('fetchBtn') as HTMLButtonElement | null,
    panelWorkspaceEl: getRequiredElement<HTMLElement>('panelWorkspace'),
    panelContentEl: getRequiredElement<HTMLElement>('panelContent'),
    workspacePanelToggleBarEl: getRequiredElement<HTMLDivElement>('workspacePanelToggleBar'),
    workspaceDockPreviewEl: getRequiredElement<HTMLDivElement>('workspaceDockPreview'),
    selectElementBtnEl: getRequiredElement<HTMLButtonElement>('selectElementBtn'),
    componentSearchInputEl: getRequiredElement<HTMLInputElement>('componentSearchInput'),
    payloadModeBtnEl: getRequiredElement<HTMLButtonElement>('payloadModeBtn'),
    elementOutputEl: getRequiredElement<HTMLDivElement>('selectedElementPane'),
    domTreeStatusEl: getRequiredElement<HTMLDivElement>('selectedElementPathPane'),
    domTreeOutputEl: getRequiredElement<HTMLDivElement>('selectedElementDomPane'),
    reactStatusEl: getRequiredElement<HTMLDivElement>('reactStatus'),
    reactComponentListEl: getRequiredElement<HTMLDivElement>('reactComponentList'),
    treePaneEl: getRequiredElement<HTMLDivElement>('treePane'),
    reactComponentDetailEl: getRequiredElement<HTMLDivElement>('reactComponentDetail'),
    debugDiagnosticsPaneEl: getRequiredElement<HTMLDivElement>('debugDiagnosticsPane'),
    debugLogPaneEl: getRequiredElement<HTMLDivElement>('debugLogPane'),
    debugLogCopyBtnEl: getRequiredElement<HTMLButtonElement>('debugLogCopyBtn'),
    debugLogClearBtnEl: getRequiredElement<HTMLButtonElement>('debugLogClearBtn'),
    workspacePanelElements: collectWorkspacePanelElements(),
  };
}
