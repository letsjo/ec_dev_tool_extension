import { parseErrorStackFrames } from "./pageAgentHookStack";
import {
  findCommonAncestorFrameIndex,
  findPrimitiveFrameIndex,
  inferGroupPathFromAllFrames,
  inferGroupPathFromTrimmedStack,
  normalizePrimitiveHookName,
} from "./pageAgentHookGrouping";
import type { HookInspectMetadataResult } from "./pageAgentHookResult";
import type { StackFrame } from "./pageAgentHookStack";

interface HookLogEntry {
  primitive: string;
  dispatcherHookName: string;
  value: unknown;
  stackError: Error;
}

/** hookLog와 stack 정보를 기반으로 custom hook metadata 배열을 구성한다. */
export function buildHookInspectMetadataFromLog(
  hookLog: HookLogEntry[],
  rootStackError: Error | null,
  componentName: string | null,
  primitiveStackCache: Map<string, StackFrame[]>,
): HookInspectMetadataResult {
  const rootFrames = parseErrorStackFrames(rootStackError);
  const groupNames: Array<string | null> = [];
  const groupPaths: Array<string[] | null> = [];
  const primitiveNames: Array<string | null> = [];
  const primitiveValues: unknown[] = [];
  const primitiveHasValue: boolean[] = [];

  for (let logIndex = 0; logIndex < hookLog.length; logIndex += 1) {
    const entry = hookLog[logIndex];
    const hookFrames = parseErrorStackFrames(entry.stackError);
    const rootIndex = findCommonAncestorFrameIndex(rootFrames, hookFrames);
    const primitiveIndex = findPrimitiveFrameIndex(
      hookFrames,
      entry,
      primitiveStackCache,
    );

    let trimmedStack: StackFrame[] = [];
    if (rootIndex !== -1 && primitiveIndex !== -1 && rootIndex - primitiveIndex >= 2) {
      trimmedStack = hookFrames.slice(primitiveIndex, rootIndex - 1);
    }

    let groupPath = inferGroupPathFromTrimmedStack(trimmedStack, entry, componentName);
    if (!groupPath || groupPath.length === 0) {
      groupPath = inferGroupPathFromAllFrames(hookFrames, entry, componentName);
    }

    groupPaths.push(groupPath && groupPath.length > 0 ? groupPath : null);
    groupNames.push(groupPath && groupPath.length > 0 ? groupPath[groupPath.length - 1] : null);
    primitiveNames.push(normalizePrimitiveHookName(entry.primitive, entry.dispatcherHookName));
    primitiveValues.push(entry.value);
    primitiveHasValue.push(true);
  }

  return {
    groupNames,
    groupPaths,
    primitiveNames,
    primitiveValues,
    primitiveHasValue,
  };
}
