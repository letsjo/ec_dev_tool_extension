import React from "react";
import { WorkspacePanel } from "../WorkspacePanel";

/** Components Tree 패널 */
export function ComponentsTreePanel() {
  return (
    <WorkspacePanel panelId="componentsTreeSection">
      <div id="treePane" className="components-pane-body">
        <div id="reactComponentList" className="react-component-list empty">
          컴포넌트 목록이 여기에 표시됩니다.
        </div>
      </div>
    </WorkspacePanel>
  );
}
