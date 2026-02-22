import React from "react";
import { PanelHeader, PanelWorkspace } from "./components";

/** 해당 기능 흐름을 처리 */
export function PanelView() {
  return (
    <div className="panel-shell">
      <PanelHeader />
      <PanelWorkspace />
    </div>
  );
}
