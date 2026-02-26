import React from "react";
import { WorkspacePanelShell } from "../WorkspacePanelShell";
import { PanelActionButton } from "../../components";

/** 액션 흐름 디버그 로그 패널 */
export function DebugLogPanel() {
  return (
    <WorkspacePanelShell
      panelId="debugLogPanel"
      summaryActions={
        <PanelActionButton
          id="debugLogCopyBtn"
          className="workspace-panel-action"
          data-panel-action="copyDebugLog"
          data-panel-target="debugLogPanel"
          title="디버그 로그 전체 복사"
          aria-label="Copy debug logs"
        >
          ⧉
        </PanelActionButton>
      }
    >
      <div id="debugDiagnosticsPane" className="debug-diagnostics empty" hidden>
        Diagnostics disabled. Set localStorage `ecDevTool.devDiagnostics=1`.
      </div>
      <div id="debugLogPane" className="empty">
        디버그 로그가 여기에 누적됩니다.
      </div>
    </WorkspacePanelShell>
  );
}
