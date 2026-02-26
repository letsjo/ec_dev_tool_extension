interface InspectReactComponentsArgs {
  selector: string;
  pickPoint: unknown;
  includeSerializedData: boolean;
  selectedComponentId: string | null;
}

/**
 * reactInspect args를 안전하게 파싱해 component inspect flow 입력으로 정규화한다.
 */
function parseInspectReactComponentsArgs(
  args: Record<string, unknown> | null | undefined,
): InspectReactComponentsArgs {
  const selectedComponentId =
    typeof args?.selectedComponentId === "string" && args.selectedComponentId
      ? args.selectedComponentId
      : null;

  return {
    selector: typeof args?.selector === "string" ? args.selector : "",
    pickPoint: args?.pickPoint,
    includeSerializedData: args?.includeSerializedData !== false,
    selectedComponentId,
  };
}

export { parseInspectReactComponentsArgs };
export type { InspectReactComponentsArgs };
