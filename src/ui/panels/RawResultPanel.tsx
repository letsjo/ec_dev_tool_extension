import React from "react";
import { WorkspacePanelShell } from "./WorkspacePanelShell";

/** Raw Result 패널 */
export function RawResultPanel() {
  return (
    <WorkspacePanelShell panelId="rawResultPanel">
      <div id="output" className="empty">
        디버그 결과가 여기에 표시됩니다.
      </div>
    </WorkspacePanelShell>
  );
}
