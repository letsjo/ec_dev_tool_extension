import React from "react";
import { PanelStatusSection } from "./PanelStatusSection";
import { PanelToolbarSection } from "./PanelToolbarSection";

/** 패널 상단 툴바/상태 영역 */
export function PanelHeaderSection() {
  return (
    <header className="panel-header">
      <PanelToolbarSection />
      <PanelStatusSection />
    </header>
  );
}
