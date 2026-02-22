import React from "react";
import { WorkspacePanels } from "./WorkspacePanels";

/** 패널 본문 메인 캔버스 */
export function WorkspaceCanvas() {
  return (
    <main id="panelContent" className="workspace-canvas">
      <div id="workspaceDockPreview" className="workspace-dock-preview" />
      <WorkspacePanels />
    </main>
  );
}
