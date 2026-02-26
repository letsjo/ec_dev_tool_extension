import { isRecord } from "../shared/inspector/guards";

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
  args: unknown,
): InspectReactComponentsArgs {
  const argRecord = isRecord(args) ? args : null;
  const selectedComponentId =
    typeof argRecord?.selectedComponentId === "string" && argRecord.selectedComponentId
      ? argRecord.selectedComponentId
      : null;

  return {
    selector: typeof argRecord?.selector === "string" ? argRecord.selector : "",
    pickPoint: argRecord?.pickPoint,
    includeSerializedData: argRecord?.includeSerializedData !== false,
    selectedComponentId,
  };
}

export { parseInspectReactComponentsArgs };
export type { InspectReactComponentsArgs };
