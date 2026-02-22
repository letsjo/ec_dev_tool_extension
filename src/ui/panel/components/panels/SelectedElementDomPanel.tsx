import React from "react";
import { WorkspacePanel } from "../WorkspacePanel";

/** Selected DOM Tree 패널 */
export function SelectedElementDomPanel() {
  return (
    <WorkspacePanel panelId="selectedElementDomPanel">
      <div id="selectedElementDomPane" className="components-pane-body empty">
        선택 요소 DOM이 여기에 표시됩니다.
      </div>
    </WorkspacePanel>
  );
}
