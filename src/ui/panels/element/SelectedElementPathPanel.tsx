import React from "react";
import { WorkspacePanelShell } from "../WorkspacePanelShell";

/** DOM Path 패널 */
export function SelectedElementPathPanel() {
  return (
    <WorkspacePanelShell panelId="selectedElementPathPanel">
      <div id="selectedElementPathPane" className="components-pane-body empty">
        요소를 선택하면 DOM 경로를 표시합니다.
      </div>
    </WorkspacePanelShell>
  );
}
