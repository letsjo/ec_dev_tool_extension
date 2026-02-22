import React from "react";
import {
  WORKSPACE_PANEL_CONFIG,
  type WorkspacePanelId,
} from "../../../features/panel/workspacePanels";

interface WorkspacePanelProps {
  panelId: WorkspacePanelId;
  children: React.ReactNode;
}

/** 공통 패널 래퍼(details/summary/actions) */
export function WorkspacePanel({ panelId, children }: WorkspacePanelProps) {
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
