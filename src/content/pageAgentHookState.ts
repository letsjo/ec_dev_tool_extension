// @ts-nocheck
import { parseHookDisplayName } from "./pageAgentHookGroups";

type AnyRecord = Record<string, any>;

/** React primitive hook metadata와 memoizedState 패턴을 조합해 hook 표시 이름을 추론한다. */
export function inferHookName(node: AnyRecord | null | undefined, index: number, hookTypes: unknown[] | null) {
  let hookTypeName = null;
  if (hookTypes && typeof hookTypes[index] === "string" && hookTypes[index]) {
    hookTypeName = parseHookDisplayName(String(hookTypes[index]).trim());
    if (hookTypeName) {
      hookTypeName = hookTypeName.charAt(0).toUpperCase() + hookTypeName.slice(1);
    }
  }
  if (!node || typeof node !== "object") return "Hook#" + String(index + 1);

  const memoizedState = node.memoizedState;
  if (node.queue && typeof node.queue === "object") {
    const reducer = node.queue.lastRenderedReducer;
    if (typeof reducer === "function") {
      const reducerName = reducer.name || "";
      if (reducerName && reducerName !== "basicStateReducer") return "Reducer";
      if (hookTypeName === "Reducer") return "Reducer";
      if (hookTypeName === "State") return "State";
      if (reducerName === "basicStateReducer") return "State";
      return "Reducer";
    }
    if (hookTypeName === "Reducer") return "Reducer";
    if (hookTypeName === "State") return "State";
    return "State";
  }
  if (hookTypeName) return hookTypeName;
  if (
    memoizedState
    && typeof memoizedState === "object"
    && "current" in memoizedState
    && !Array.isArray(memoizedState)
  ) {
    return "Ref";
  }
  if (Array.isArray(memoizedState) && memoizedState.length === 2 && Array.isArray(memoizedState[1])) {
    return typeof memoizedState[0] === "function" ? "Callback" : "Memo";
  }
  if (
    memoizedState
    && typeof memoizedState === "object"
    && ("create" in memoizedState || "destroy" in memoizedState)
  ) {
    return "Effect";
  }
  return "Hook#" + String(index + 1);
}

/** 표시/전달용 값으로 변환 */
function toRefCurrentDisplayValue(value: unknown) {
  if (typeof Element !== "undefined" && value instanceof Element) {
    const tagName = String(value.tagName || "").toLowerCase();
    return tagName ? `<${tagName} />` : "<element />";
  }
  return value;
}

/** Ref hook은 current 값을 사람이 읽기 쉬운 값으로 정규화한다. */
export function normalizeHookStateForDisplay(hookName: string, state: unknown) {
  if (hookName !== "Ref") return state;
  if (state && typeof state === "object" && !Array.isArray(state) && "current" in state) {
    return toRefCurrentDisplayValue(state.current);
  }
  return toRefCurrentDisplayValue(state);
}
