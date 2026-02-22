import React from "react";
import {
  ComponentsInspectorPanel,
  ComponentsTreePanel,
  RawResultPanel,
  SelectedElementDomPanel,
  SelectedElementPanel,
  SelectedElementPathPanel,
} from "../panels";

/** 워크스페이스 내 기본 패널 집합 */
export function WorkspacePanelsSection() {
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
