import React from "react";

type NativeButtonProps = Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "type">;

interface PanelActionButtonProps extends NativeButtonProps {
  children: React.ReactNode;
}

/** 공통 버튼 UI 래퍼 */
export function PanelActionButton({ children, ...buttonProps }: PanelActionButtonProps) {
  return (
    <button type="button" {...buttonProps}>
      {children}
    </button>
  );
}
