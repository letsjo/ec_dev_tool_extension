import React from "react";
import { PanelActionButton } from "./PanelActionButton";

type NativeButtonProps = Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "type">;

interface IconButtonProps extends NativeButtonProps {
  children: React.ReactNode;
}

/** 아이콘 버튼 공통 컴포넌트 */
export function IconButton({ children, ...buttonProps }: IconButtonProps) {
  return <PanelActionButton {...buttonProps}>{children}</PanelActionButton>;
}
