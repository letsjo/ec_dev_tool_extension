import React from "react";

interface PanelSubtitleProps {
  id: string;
  className?: string;
  children: React.ReactNode;
}

/** 헤더 상태/서브타이틀 텍스트 영역 */
export function PanelSubtitle({ id, className, children }: PanelSubtitleProps) {
  return (
    <div id={id} className={className}>
      {children}
    </div>
  );
}
