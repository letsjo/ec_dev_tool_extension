import React from "react";
import { PanelSubtitle } from "../../components";

/** 상단 상태 문구 영역 */
export function PanelStatusSection() {
  return (
    <PanelSubtitle id="reactStatus" className="react-status empty">
      요소를 선택하면 컴포넌트 트리를 불러옵니다.
    </PanelSubtitle>
  );
}
