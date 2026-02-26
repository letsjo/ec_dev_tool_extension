import React from "react";
import {
  WORKSPACE_PANEL_CONFIG,
  type WorkspacePanelId,
} from "../../features/panel/workspacePanels";
import { PanelActionButton } from "../components";

interface WorkspacePanelShellProps {
  panelId: WorkspacePanelId;
  children: React.ReactNode;
}

/** 공통 패널 래퍼(details/summary/actions) */
export function WorkspacePanelShell({ panelId, children }: WorkspacePanelShellProps) {
  const panelConfig = WORKSPACE_PANEL_CONFIG[panelId];

  return (
    <details id={panelId} className="result-panel workspace-panel" data-panel-id={panelId} open>
      <summary draggable className="workspace-panel-summary">
        <span className="workspace-panel-title">{panelConfig.title}</span>
        <span className="workspace-panel-actions">
          <PanelActionButton
            className="workspace-panel-action"
            data-panel-action="toggle"
            data-panel-target={panelId}
            title="접기/펼치기"
          >
            −
          </PanelActionButton>
          <PanelActionButton
            className="workspace-panel-action"
            data-panel-action="close"
            data-panel-target={panelId}
            title="패널 닫기"
          >
            ×
          </PanelActionButton>
        </span>
      </summary>
      {children}
    </details>
  );
}
