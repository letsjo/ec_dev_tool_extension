import { isLikelyCustomHookFrame } from "./pageAgentHookStack";
import type { StackFrame } from "./pageAgentHookStack";

type HookGroupEntry = {
  primitive?: string | null;
  dispatcherHookName?: string | null;
};

/** frame 목록에서 custom hook path를 수집한다(primitive/dispatcher/component frame 제외). */
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

/** hook 전체 stack을 대상으로 custom hook path를 추론한다. */
function inferGroupPathFromAllFrames(
  hookFrames: StackFrame[],
  entry: HookGroupEntry | null | undefined,
  componentName: string | null | undefined,
) {
  return collectCustomHookPathFromFrames(hookFrames, entry, componentName);
}

/** root/primitive 기준 trim된 stack을 우선 사용해 custom hook path를 추론한다. */
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

export { inferGroupPathFromAllFrames, inferGroupPathFromTrimmedStack };
