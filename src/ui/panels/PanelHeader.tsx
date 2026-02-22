import React from "react";
import { IconButton, PanelSubtitle } from "../components";

/** 패널 상단 툴바/상태 영역 */
export function PanelHeader() {
  return (
    <header className="panel-header">
      <div className="toolbar">
        <div className="toolbar-left">
          <IconButton
            id="selectElementBtn"
            className="icon-button"
            aria-label="Select element"
            title="요소 선택 모드 시작"
          >
            <span aria-hidden="true">⌖</span>
          </IconButton>
          <input
            id="componentSearchInput"
            className="tree-search-input"
            type="search"
            placeholder="Search components (name, selector, path)"
          />
        </div>
      </div>

      <PanelSubtitle id="reactStatus" className="react-status empty">
        요소를 선택하면 컴포넌트 트리를 불러옵니다.
      </PanelSubtitle>
    </header>
  );
}
