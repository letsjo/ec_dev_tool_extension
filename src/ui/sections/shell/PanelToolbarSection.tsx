import React from "react";
import { IconButton } from "../../components";

/** 상단 툴바(선택/검색/페이로드 모드) */
export function PanelToolbarSection() {
  return (
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
        <button
          id="payloadModeBtn"
          className="text-button"
          type="button"
          title="Payload mode: Lite"
          aria-label="Toggle payload mode"
          aria-pressed="false"
        >
          Lite
        </button>
      </div>
    </div>
  );
}
