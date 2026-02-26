type HookSummary = {
  index: number;
  name: string;
  state: unknown;
  group: string | null;
  groupPath: string[] | null;
};

interface CustomHookMetadata {
  groupNames?: unknown[];
  groupPaths?: unknown[];
  primitiveNames?: unknown[];
  primitiveValues?: unknown[];
  primitiveHasValue?: unknown[];
}

function asArrayOrNull(value: unknown): unknown[] | null {
  return Array.isArray(value) ? value : null;
}

/** custom hook 메타를 hooks 배열에 병합한다. 없는 슬롯은 fallback hook으로 채운다. */
export function applyCustomHookMetadata(
  hooks: HookSummary[],
  customMetadata: CustomHookMetadata | null | undefined,
): HookSummary[] {
  if (!Array.isArray(hooks) || !customMetadata || typeof customMetadata !== "object") {
    return hooks;
  }

  const customGroups = asArrayOrNull(customMetadata.groupNames);
  const customGroupPaths = asArrayOrNull(customMetadata.groupPaths);
  const primitiveNames = asArrayOrNull(customMetadata.primitiveNames);
  const primitiveValues = asArrayOrNull(customMetadata.primitiveValues);
  const primitiveHasValue = asArrayOrNull(customMetadata.primitiveHasValue);

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
        const normalizedPath = groupPath.filter((item): item is string => {
          return typeof item === "string" && Boolean(item);
        });
        hooks[i].groupPath = normalizedPath.length > 0 ? normalizedPath : null;
      } else {
        hooks[i].groupPath = null;
      }
    }
  }

  return hooks;
}

export type { HookSummary, CustomHookMetadata };
