import React from "react";
import { PanelHeader } from "./PanelHeader";
import { PanelWorkspace } from "./PanelWorkspace";

/** 해당 기능 흐름을 처리 */
export function PanelView() {
  return (
    <div className="panel-shell">
      <PanelHeader />
      <PanelWorkspace />
    </div>
  );
}
