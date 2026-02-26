import React from "react";
import { WorkspacePanelsSection } from "./WorkspacePanelsSection";

/** 패널 본문 메인 캔버스 */
export function WorkspaceCanvasSection() {
  return (
    <main id="panelContent" className="workspace-canvas">
      <div id="workspaceDockPreview" className="workspace-dock-preview" />
      <WorkspacePanelsSection />
    </main>
  );
}
