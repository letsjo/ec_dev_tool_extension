type StackFrame = { functionName: string | null; source: string | null };

const BUILTIN_HOOK_NAMES: Record<string, true> = {
  State: true,
  Reducer: true,
  Effect: true,
  LayoutEffect: true,
  InsertionEffect: true,
  ImperativeHandle: true,
  Memo: true,
  Callback: true,
  Ref: true,
  DeferredValue: true,
  Transition: true,
  SyncExternalStore: true,
  Id: true,
  DebugValue: true,
  ClassState: true,
  Hook: true,
  Truncated: true,
  Context: true,
  Use: true,
  Promise: true,
  Unresolved: true,
  Optimistic: true,
  FormState: true,
  ActionState: true,
  HostTransitionStatus: true,
  EffectEvent: true,
  MemoCache: true,
};

/** hook/function 이름을 display-friendly 값으로 정규화한다. */
function parseHookDisplayName(functionName: string | null | undefined) {
  if (!functionName) return "";
  let name = String(functionName);

  const asIndex = name.lastIndexOf("[as ");
  if (asIndex !== -1 && name.charAt(name.length - 1) === "]") {
    return parseHookDisplayName(name.slice(asIndex + "[as ".length, -1));
  }

  const dotIndex = name.lastIndexOf(".");
  if (dotIndex >= 0) {
    name = name.slice(dotIndex + 1);
  }

  if (name.indexOf("unstable_") === 0) {
    name = name.slice("unstable_".length);
  }
  if (name.indexOf("experimental_") === 0) {
    name = name.slice("experimental_".length);
  }

  if (name.indexOf("use") === 0) {
    if (name.length === 3) return "Use";
    name = name.slice(3);
  }

  if (!name) return "";
  return name.charAt(0).toUpperCase() + name.slice(1);
}

/** 함수명이 커스텀 훅 규칙(useXxx)을 따르는지 판별 */
function isCustomHookFunctionName(functionName: string | null | undefined) {
  if (!functionName) return false;
  let name = String(functionName);

  const asIndex = name.lastIndexOf("[as ");
  if (asIndex !== -1 && name.charAt(name.length - 1) === "]") {
    return isCustomHookFunctionName(name.slice(asIndex + "[as ".length, -1));
  }

  const dotIndex = name.lastIndexOf(".");
  if (dotIndex >= 0) {
    name = name.slice(dotIndex + 1);
  }

  if (name.indexOf("unstable_") === 0) {
    name = name.slice("unstable_".length);
  }
  if (name.indexOf("experimental_") === 0) {
    name = name.slice("experimental_".length);
  }

  return name.indexOf("use") === 0 && name.length > 3;
}

/** 스택 소스가 React/확장 내부 프레임인지 판별 */
function isLikelyReactInternalSource(source: string | null | undefined) {
  if (!source) return false;
  const text = String(source).toLowerCase();
  return (
    text.includes("react-dom")
    || text.includes("react.development")
    || text.includes("react.production")
    || text.includes("scheduler")
    || text.includes("react-refresh")
    || text.includes("pageagent.global.js")
    || text.includes("content.global.js")
    || text.includes("reactruntimehook.global.js")
    || text.includes("background.global.js")
    || text.includes("panel.global.js")
    || text.includes("chrome-extension://")
  );
}

/** 프레임이 커스텀 훅 후보로 볼 수 있는지 판별 */
function isLikelyCustomHookFrame(frame: StackFrame | null | undefined) {
  if (!frame) return null;
  const rawFunctionName = frame.functionName;
  const parsedName = parseHookDisplayName(rawFunctionName);
  if (!parsedName) return null;
  if (BUILTIN_HOOK_NAMES[parsedName]) return null;
  if (parsedName === "Object" || parsedName === "Anonymous") return null;
  if (isLikelyReactInternalSource(frame.source)) return null;

  const hasUsePrefix = isCustomHookFunctionName(rawFunctionName);
  const startsWithUpper = /^[A-Z]/.test(parsedName);
  if (!hasUsePrefix && !startsWithUpper) return null;

  return parsedName;
}

/** Error.stack 문자열에서 프레임 목록을 파싱한다. */
function parseErrorStackFrames(error: Error | null | undefined) {
  if (!error || typeof error.stack !== "string") return [];
  const lines = error.stack.split("\n");
  const frames: StackFrame[] = [];
  for (let i = 1; i < lines.length; i += 1) {
    let line = String(lines[i] || "").trim();
    if (!line) continue;
    if (line.indexOf("at ") === 0) {
      line = line.slice(3).trim();
    }

    let functionName = "";
    let source = line;
    const withParenMatch = line.match(/^(.*) \((.*)\)$/);
    if (withParenMatch) {
      functionName = withParenMatch[1].trim();
      source = withParenMatch[2].trim();
    } else {
      const atIndex = line.lastIndexOf("@");
      if (atIndex > 0) {
        functionName = line.slice(0, atIndex).trim();
        source = line.slice(atIndex + 1).trim();
      }
    }

    frames.push({
      functionName: functionName || null,
      source: source || null,
    });
  }
  return frames;
}

export {
  isLikelyCustomHookFrame,
  parseErrorStackFrames,
  parseHookDisplayName,
};
export type { StackFrame };
