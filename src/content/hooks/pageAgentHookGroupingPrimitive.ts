import { parseHookDisplayName } from "./pageAgentHookStack";
import type { StackFrame } from "./pageAgentHookStack";

type HookGroupEntry = {
  primitive?: string | null;
  dispatcherHookName?: string | null;
};

/** 프레임 이름이 지정한 React wrapper hook 이름과 일치하는지 판별한다. */
function isReactWrapperFrame(functionName: string | null | undefined, wrapperName: string) {
  const hookName = parseHookDisplayName(functionName);
  if (wrapperName === "HostTransitionStatus") {
    return hookName === wrapperName || hookName === "FormStatus";
  }
  return hookName === wrapperName;
}

/** primitive stack cache와 hook stack을 비교해 primitive frame 시작 index를 찾는다. */
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
      // HostTransitionStatus 같은 wrapper hook은 stack에 1~2 frame을 추가할 수 있어 보정한다.
      if (
        i < hookFrames.length - 1 &&
        isReactWrapperFrame(hookFrames[i] && hookFrames[i].functionName, entry.dispatcherHookName || "")
      ) {
        i += 1;
      }
      if (
        i < hookFrames.length - 1 &&
        isReactWrapperFrame(hookFrames[i] && hookFrames[i].functionName, entry.dispatcherHookName || "")
      ) {
        i += 1;
      }
      return i;
    }
  }

  return -1;
}

/** primitive hook 이름을 표시/비교 가능한 형태로 정규화한다. */
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

export { findPrimitiveFrameIndex, normalizePrimitiveHookName };
