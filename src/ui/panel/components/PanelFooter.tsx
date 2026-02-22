import React from "react";
import {
  WORKSPACE_PANEL_CONFIG,
  WORKSPACE_PANEL_IDS,
} from "../../../features/panel/workspacePanels";

/** 패널 하단 토글 바 */
export function PanelFooter() {
  return (
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
  );
}
