import React from "react";
import {
  ComponentsInspectorPanel,
  ComponentsTreePanel,
  RawResultPanel,
  SelectedElementDomPanel,
  SelectedElementPanel,
  SelectedElementPathPanel,
} from "./sections";

/** 워크스페이스 내 기본 패널 집합 */
export function WorkspacePanels() {
  return (
    <>
      <ComponentsTreePanel />
      <ComponentsInspectorPanel />
      <SelectedElementPanel />
      <SelectedElementPathPanel />
      <SelectedElementDomPanel />
      <RawResultPanel />
    </>
  );
}
