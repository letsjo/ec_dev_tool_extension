import React from "react";
import { WorkspacePanel } from "../WorkspacePanel";

/** DOM Path 패널 */
export function SelectedElementPathPanel() {
  return (
    <WorkspacePanel panelId="selectedElementPathPanel">
      <div id="selectedElementPathPane" className="components-pane-body empty">
        요소를 선택하면 DOM 경로를 표시합니다.
      </div>
    </WorkspacePanel>
  );
}
