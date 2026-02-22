import React from "react";
import { PanelHeaderSection } from "./PanelHeaderSection";
import { PanelWorkspaceSection } from "./PanelWorkspaceSection";

/** 해당 기능 흐름을 처리 */
export function PanelViewSection() {
  return (
    <div className="panel-shell">
      <PanelHeaderSection />
      <PanelWorkspaceSection />
    </div>
  );
}
