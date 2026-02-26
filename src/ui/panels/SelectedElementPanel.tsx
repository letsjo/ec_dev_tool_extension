import React from "react";
import { WorkspacePanelShell } from "./WorkspacePanelShell";

/** Selected Element 패널 */
export function SelectedElementPanel() {
  return (
    <WorkspacePanelShell panelId="selectedElementPanel">
      <div id="selectedElementPane" className="components-pane-body empty">
        버튼을 누른 뒤 페이지에서 요소를 클릭하세요. (취소: Esc)
      </div>
    </WorkspacePanelShell>
  );
}
