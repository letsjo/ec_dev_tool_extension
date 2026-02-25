import { isLikelyCustomHookFrame, parseHookDisplayName } from "./pageAgentHookStack";
import type { StackFrame } from "./pageAgentHookStack";

type HookGroupEntry = {
  primitive?: string | null;
  dispatcherHookName?: string | null;
};

let mostLikelyAncestorFrameIndex = 0;

/** 조건에 맞는 대상을 탐색 */
function findSharedFrameIndex(
  hookFrames: StackFrame[],
  rootFrames: StackFrame[],
  rootIndex: number,
) {
  const rootFrame = rootFrames[rootIndex];
  const source = rootFrame && rootFrame.source;
  if (!source) return -1;

  hookSearch:
  for (let i = 0; i < hookFrames.length; i += 1) {
    if (!hookFrames[i] || hookFrames[i].source !== source) continue;

    for (
      let a = rootIndex + 1, b = i + 1;
      a < rootFrames.length && b < hookFrames.length;
      a += 1, b += 1
    ) {
      const rootSource = rootFrames[a] && rootFrames[a].source;
      const hookSource = hookFrames[b] && hookFrames[b].source;
      if (rootSource !== hookSource) {
        continue hookSearch;
      }
    }
    return i;
  }
  return -1;
}

/** 조건에 맞는 대상을 탐색 */
function findCommonAncestorFrameIndex(rootFrames: StackFrame[], hookFrames: StackFrame[]) {
  if (!rootFrames || !hookFrames || rootFrames.length === 0 || hookFrames.length === 0) {
    return -1;
  }

  let rootIndex = findSharedFrameIndex(
    hookFrames,
    rootFrames,
    mostLikelyAncestorFrameIndex,
  );
  if (rootIndex !== -1) {
    return rootIndex;
  }

  const maxRootProbe = Math.min(rootFrames.length, 5);
  for (let i = 0; i < maxRootProbe; i += 1) {
    rootIndex = findSharedFrameIndex(hookFrames, rootFrames, i);
    if (rootIndex !== -1) {
      mostLikelyAncestorFrameIndex = i;
      return rootIndex;
    }
  }
  return -1;
}

/** 데이터를 순회해 수집 */
function collectCustomHookPathFromFrames(
  frames: StackFrame[],
  entry: HookGroupEntry | null | undefined,
  componentName: string | null | undefined,
) {
  if (!Array.isArray(frames) || frames.length === 0) return null;
  const names: string[] = [];
  for (let i = 0; i < frames.length; i += 1) {
    const parsedName = isLikelyCustomHookFrame(frames[i]);
    if (!parsedName) continue;
    if (componentName && parsedName === componentName) continue;
    if (
      entry &&
      (parsedName === entry.dispatcherHookName || parsedName === entry.primitive)
    ) {
      continue;
    }
    if (names.length > 0 && names[names.length - 1] === parsedName) continue;
    names.push(parsedName);
  }
  if (names.length === 0) return null;
  names.reverse();
  return names;
}

/** 해당 기능 흐름을 처리 */
function inferGroupPathFromAllFrames(
  hookFrames: StackFrame[],
  entry: HookGroupEntry | null | undefined,
  componentName: string | null | undefined,
) {
  return collectCustomHookPathFromFrames(hookFrames, entry, componentName);
}

/** 프레임 이름이 지정한 React 래퍼 훅 이름과 일치하는지 판별 */
function isReactWrapperFrame(
  functionName: string | null | undefined,
  wrapperName: string,
) {
  const hookName = parseHookDisplayName(functionName);
  if (wrapperName === "HostTransitionStatus") {
    return hookName === wrapperName || hookName === "FormStatus";
  }
  return hookName === wrapperName;
}

/** 조건에 맞는 대상을 탐색 */
function findPrimitiveFrameIndex(
  hookFrames: StackFrame[],
  entry: HookGroupEntry | null | undefined,
  primitiveStackCache: Map<string, StackFrame[]>,
) {
  if (!hookFrames || hookFrames.length === 0 || !entry || !primitiveStackCache) return -1;
  const primitiveName = entry.primitive;
  if (!primitiveName) return -1;
  const primitiveStack = primitiveStackCache.get(primitiveName);
  if (!primitiveStack) return -1;

  for (let i = 0; i < primitiveStack.length && i < hookFrames.length; i += 1) {
    const primitiveSource = primitiveStack[i] && primitiveStack[i].source;
    const hookSource = hookFrames[i] && hookFrames[i].source;
    if (primitiveSource !== hookSource) {
      if (
        i < hookFrames.length - 1 &&
        isReactWrapperFrame(
          hookFrames[i] && hookFrames[i].functionName,
          entry.dispatcherHookName || "",
        )
      ) {
        i += 1;
      }
      if (
        i < hookFrames.length - 1 &&
        isReactWrapperFrame(
          hookFrames[i] && hookFrames[i].functionName,
          entry.dispatcherHookName || "",
        )
      ) {
        i += 1;
      }
      return i;
    }
  }
  return -1;
}

/** 해당 기능 흐름을 처리 */
function inferGroupPathFromTrimmedStack(
  trimmedFrames: StackFrame[],
  entry: HookGroupEntry | null | undefined,
  componentName: string | null | undefined,
) {
  if (!Array.isArray(trimmedFrames) || trimmedFrames.length === 0) return null;
  const maxFrames = Math.min(trimmedFrames.length, 24);
  return collectCustomHookPathFromFrames(
    trimmedFrames.slice(0, maxFrames),
    entry,
    componentName,
  );
}

/** 입력 데이터를 표시/비교용으로 정규화 */
function normalizePrimitiveHookName(
  primitive: string | null | undefined,
  dispatcherHookName: string | null | undefined,
) {
  let name = parseHookDisplayName(primitive);
  if (!name && typeof primitive === "string" && primitive) {
    name = primitive;
  }
  if (name === "Context (use)") {
    name = "Context";
  }
  if (!name) {
    name = parseHookDisplayName(dispatcherHookName);
  }
  if (!name) return null;
  return name.charAt(0).toUpperCase() + name.slice(1);
}

export {
  findCommonAncestorFrameIndex,
  findPrimitiveFrameIndex,
  inferGroupPathFromAllFrames,
  inferGroupPathFromTrimmedStack,
  normalizePrimitiveHookName,
};
