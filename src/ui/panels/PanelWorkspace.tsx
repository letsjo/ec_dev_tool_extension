import React from "react";
import { PanelFooter } from "./PanelFooter";
import { WorkspaceCanvas } from "./WorkspaceCanvas";

/** 워크스페이스(메인 캔버스 + footer) */
export function PanelWorkspace() {
  return (
    <section id="panelWorkspace" className="panel-workspace">
      <WorkspaceCanvas />
      <PanelFooter />
    </section>
  );
}
