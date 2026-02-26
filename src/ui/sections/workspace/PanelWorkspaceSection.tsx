import React from "react";
import { PanelFooterSection } from "../shell/PanelFooterSection";
import { WorkspaceCanvasSection } from "./WorkspaceCanvasSection";

/** 워크스페이스(메인 캔버스 + footer) */
export function PanelWorkspaceSection() {
  return (
    <section id="panelWorkspace" className="panel-workspace">
      <WorkspaceCanvasSection />
      <PanelFooterSection />
    </section>
  );
}
