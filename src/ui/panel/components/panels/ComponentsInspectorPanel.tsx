import React from "react";
import { WorkspacePanel } from "../WorkspacePanel";

/** Components Inspector 패널 */
export function ComponentsInspectorPanel() {
  return (
    <WorkspacePanel panelId="componentsInspectorPanel">
      <div id="detailPane" className="components-pane-body">
        <div id="reactComponentDetail" className="react-component-detail empty">
          컴포넌트를 선택하면 props/hooks를 표시합니다.
        </div>
      </div>
    </WorkspacePanel>
  );
}
