// @ts-nocheck
type AnyRecord = Record<string, any>;

type HookSummary = {
  index: number;
  name: string;
  state: unknown;
  group: string | null;
  groupPath: string[] | null;
};

/** custom hook 메타를 hooks 배열에 병합한다. 없는 슬롯은 fallback hook으로 채운다. */
export function applyCustomHookMetadata(hooks: HookSummary[], customMetadata: AnyRecord | null | undefined) {
  if (!Array.isArray(hooks) || !customMetadata || typeof customMetadata !== "object") {
    return hooks;
  }

  const customGroups = Array.isArray(customMetadata.groupNames)
    ? customMetadata.groupNames
    : null;
  const customGroupPaths = Array.isArray(customMetadata.groupPaths)
    ? customMetadata.groupPaths
    : null;
  const primitiveNames = Array.isArray(customMetadata.primitiveNames)
    ? customMetadata.primitiveNames
    : null;
  const primitiveValues = Array.isArray(customMetadata.primitiveValues)
    ? customMetadata.primitiveValues
    : null;
  const primitiveHasValue = Array.isArray(customMetadata.primitiveHasValue)
    ? customMetadata.primitiveHasValue
    : null;

  const metadataLength = Math.max(
    hooks.length,
    customGroups ? customGroups.length : 0,
    customGroupPaths ? customGroupPaths.length : 0,
    primitiveNames ? primitiveNames.length : 0,
    primitiveValues ? primitiveValues.length : 0,
    primitiveHasValue ? primitiveHasValue.length : 0,
  );

  while (hooks.length < metadataLength) {
    const index = hooks.length;
    let fallbackName = "Hook#" + String(index + 1);
    if (primitiveNames && typeof primitiveNames[index] === "string" && primitiveNames[index]) {
      fallbackName = primitiveNames[index];
    }
    let fallbackState = undefined;
    if (primitiveValues && primitiveHasValue && primitiveHasValue[index] === true) {
      fallbackState = primitiveValues[index];
    }
    hooks.push({
      index,
      name: fallbackName,
      state: fallbackState,
      group: null,
      groupPath: null,
    });
  }

  for (let i = 0; i < hooks.length; i += 1) {
    if (primitiveNames) {
      const primitiveName = primitiveNames[i];
      if (typeof primitiveName === "string" && primitiveName) {
        hooks[i].name = primitiveName;
      }
    }
    if (primitiveValues && primitiveHasValue && primitiveHasValue[i] === true) {
      hooks[i].state = primitiveValues[i];
    }
    if (customGroups) {
      const groupName = customGroups[i];
      if (typeof groupName === "string" && groupName) {
        hooks[i].group = groupName;
      }
    }
    if (customGroupPaths) {
      const groupPath = customGroupPaths[i];
      if (Array.isArray(groupPath) && groupPath.length > 0) {
        hooks[i].groupPath = groupPath.filter((item) => typeof item === "string" && item);
      } else {
        hooks[i].groupPath = null;
      }
    }
  }

  return hooks;
}
