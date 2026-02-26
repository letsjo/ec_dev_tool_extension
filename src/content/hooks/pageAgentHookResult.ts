export interface HookInspectMetadataResult {
  groupNames: Array<string | null>;
  groupPaths: Array<string[] | null>;
  primitiveNames: Array<string | null>;
  primitiveValues: unknown[];
  primitiveHasValue: boolean[];
}

/** hook metadata 배열들을 expectedCount 길이에 맞춰 패딩/절단한다. */
export function alignHookInspectMetadataResultLength(
  result: HookInspectMetadataResult,
  expectedCount: number | null | undefined,
) {
  if (typeof expectedCount !== "number" || expectedCount < 0) {
    return result;
  }

  while (result.groupNames.length < expectedCount) {
    result.groupNames.push(null);
  }
  if (result.groupNames.length > expectedCount) {
    result.groupNames.length = expectedCount;
  }

  while (result.groupPaths.length < expectedCount) {
    result.groupPaths.push(null);
  }
  if (result.groupPaths.length > expectedCount) {
    result.groupPaths.length = expectedCount;
  }

  while (result.primitiveNames.length < expectedCount) {
    result.primitiveNames.push(null);
  }
  if (result.primitiveNames.length > expectedCount) {
    result.primitiveNames.length = expectedCount;
  }

  while (result.primitiveValues.length < expectedCount) {
    result.primitiveValues.push(undefined);
  }
  if (result.primitiveValues.length > expectedCount) {
    result.primitiveValues.length = expectedCount;
  }

  while (result.primitiveHasValue.length < expectedCount) {
    result.primitiveHasValue.push(false);
  }
  if (result.primitiveHasValue.length > expectedCount) {
    result.primitiveHasValue.length = expectedCount;
  }

  return result;
}
