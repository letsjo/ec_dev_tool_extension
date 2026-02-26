import type { StackFrame } from "./pageAgentHookStack";

let mostLikelyAncestorFrameIndex = 0;

/** root/hook stack source가 공통으로 이어지는 지점의 hook frame index를 찾는다. */
function findSharedFrameIndex(
  hookFrames: StackFrame[],
  rootFrames: StackFrame[],
  rootIndex: number,
) {
  const rootFrame = rootFrames[rootIndex];
  const source = rootFrame && rootFrame.source;
  if (!source) return -1;

  hookSearch: for (let i = 0; i < hookFrames.length; i += 1) {
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

/** root/hook stack의 공통 조상 frame index를 휴리스틱 캐시와 함께 찾는다. */
function findCommonAncestorFrameIndex(rootFrames: StackFrame[], hookFrames: StackFrame[]) {
  if (!rootFrames || !hookFrames || rootFrames.length === 0 || hookFrames.length === 0) {
    return -1;
  }

  let rootIndex = findSharedFrameIndex(hookFrames, rootFrames, mostLikelyAncestorFrameIndex);
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

export { findCommonAncestorFrameIndex };
