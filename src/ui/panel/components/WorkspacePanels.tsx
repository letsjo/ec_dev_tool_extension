import React from "react";
import { WorkspacePanel } from "./WorkspacePanel";

/** Components Tree 패널 */
export function ComponentsTreePanel() {
  return (
    <WorkspacePanel panelId="componentsTreeSection">
      <div id="treePane" className="components-pane-body">
        <div id="reactComponentList" className="react-component-list empty">
          컴포넌트 목록이 여기에 표시됩니다.
        </div>
      </div>
    </WorkspacePanel>
  );
}

/** Components Inspector 패널 */
export function ComponentsInspectorPanel() {
  return (
    <WorkspacePanel panelId="componentsInspectorPanel">
      <div id="detailPane" className="components-pane-body">
        <div id="reactComponentDetail" className="react-component-detail empty">
          컴포넌트를 선택하면 props/hooks를 표시합니다.
        </div>
      </div>
    </WorkspacePanel>
  );
}

/** Selected Element 패널 */
export function SelectedElementPanel() {
  return (
    <WorkspacePanel panelId="selectedElementPanel">
      <div id="selectedElementPane" className="components-pane-body empty">
        버튼을 누른 뒤 페이지에서 요소를 클릭하세요. (취소: Esc)
      </div>
    </WorkspacePanel>
  );
}

/** DOM Path 패널 */
export function SelectedElementPathPanel() {
  return (
    <WorkspacePanel panelId="selectedElementPathPanel">
      <div id="selectedElementPathPane" className="components-pane-body empty">
        요소를 선택하면 DOM 경로를 표시합니다.
      </div>
    </WorkspacePanel>
  );
}

/** Selected DOM Tree 패널 */
export function SelectedElementDomPanel() {
  return (
    <WorkspacePanel panelId="selectedElementDomPanel">
      <div id="selectedElementDomPane" className="components-pane-body empty">
        선택 요소 DOM이 여기에 표시됩니다.
      </div>
    </WorkspacePanel>
  );
}

/** Raw Result 패널 */
export function RawResultPanel() {
  return (
    <WorkspacePanel panelId="rawResultPanel">
      <div id="output" className="empty">
        디버그 결과가 여기에 표시됩니다.
      </div>
    </WorkspacePanel>
  );
}

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
