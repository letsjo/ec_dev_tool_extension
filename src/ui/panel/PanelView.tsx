import React from "react";
import {
  WORKSPACE_PANEL_CONFIG,
  WORKSPACE_PANEL_IDS,
  type WorkspacePanelId,
} from "../../features/panel/workspacePanels";

interface WorkspacePanelProps {
  panelId: WorkspacePanelId;
  children: React.ReactNode;
}

/** 해당 기능 흐름을 처리 */
function WorkspacePanel({ panelId, children }: WorkspacePanelProps) {
  const panelConfig = WORKSPACE_PANEL_CONFIG[panelId];
  return (
    <details id={panelId} className="result-panel workspace-panel" data-panel-id={panelId} open>
      <summary draggable className="workspace-panel-summary">
        <span className="workspace-panel-title">{panelConfig.title}</span>
        <span className="workspace-panel-actions">
          <button
            type="button"
            className="workspace-panel-action"
            data-panel-action="toggle"
            data-panel-target={panelId}
            title="접기/펼치기"
          >
            −
          </button>
          <button
            type="button"
            className="workspace-panel-action"
            data-panel-action="close"
            data-panel-target={panelId}
            title="패널 닫기"
          >
            ×
          </button>
        </span>
      </summary>
      {children}
    </details>
  );
}

/** 해당 기능 흐름을 처리 */
export function PanelView() {
  return (
    <div className="panel-shell">
      <header className="panel-header">
        <div className="toolbar">
          <div className="toolbar-left">
            <button
              id="selectElementBtn"
              className="icon-button"
              type="button"
              aria-label="Select element"
              title="요소 선택 모드 시작"
            >
              <span aria-hidden="true">⌖</span>
            </button>
            <input
              id="componentSearchInput"
              className="tree-search-input"
              type="search"
              placeholder="Search components (name, selector, path)"
            />
          </div>
        </div>

        <div id="reactStatus" className="react-status empty">
          요소를 선택하면 컴포넌트 트리를 불러옵니다.
        </div>
      </header>

      <section id="panelWorkspace" className="panel-workspace">
        <main id="panelContent" className="workspace-canvas">
          <div id="workspaceDockPreview" className="workspace-dock-preview" />

          <WorkspacePanel panelId="componentsTreeSection">
            <div id="treePane" className="components-pane-body">
              <div id="reactComponentList" className="react-component-list empty">
                컴포넌트 목록이 여기에 표시됩니다.
              </div>
            </div>
          </WorkspacePanel>

          <WorkspacePanel panelId="componentsInspectorPanel">
            <div id="detailPane" className="components-pane-body">
              <div id="reactComponentDetail" className="react-component-detail empty">
                컴포넌트를 선택하면 props/hooks를 표시합니다.
              </div>
            </div>
          </WorkspacePanel>

          <WorkspacePanel panelId="selectedElementPanel">
            <div id="selectedElementPane" className="components-pane-body empty">
              버튼을 누른 뒤 페이지에서 요소를 클릭하세요. (취소: Esc)
            </div>
          </WorkspacePanel>

          <WorkspacePanel panelId="selectedElementPathPanel">
            <div id="selectedElementPathPane" className="components-pane-body empty">
              요소를 선택하면 DOM 경로를 표시합니다.
            </div>
          </WorkspacePanel>

          <WorkspacePanel panelId="selectedElementDomPanel">
            <div id="selectedElementDomPane" className="components-pane-body empty">
              선택 요소 DOM이 여기에 표시됩니다.
            </div>
          </WorkspacePanel>

          <WorkspacePanel panelId="rawResultPanel">
            <div id="output" className="empty">
              디버그 결과가 여기에 표시됩니다.
            </div>
          </WorkspacePanel>
        </main>

        <footer id="panelFooter" className="workspace-footer">
          <div className="workspace-footer-title">Panels</div>
          <div id="workspacePanelToggleBar" className="workspace-toggle-bar">
            {WORKSPACE_PANEL_IDS.map((panelId) => (
              <button key={panelId} type="button" className="workspace-toggle-btn" data-panel-toggle={panelId}>
                {WORKSPACE_PANEL_CONFIG[panelId].toggleLabel}
              </button>
            ))}
          </div>
        </footer>
      </section>
    </div>
  );
}
