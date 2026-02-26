type AnyRecord = Record<string, any>;

type InspectPathMode = "serializeValue" | "inspectFunction";

interface ResolveInspectPathModeArgs {
  mode: InspectPathMode;
  value: unknown;
  serializeLimit: number;
  makeSerializer: (options: AnyRecord) => (value: unknown, depth?: number) => unknown;
  registerFunctionForInspect: (value: Function) => string;
}

/** inspectPath mode에 따라 직렬화 응답 또는 함수 inspect 참조 응답을 구성한다. */
function resolveInspectPathModeResponse(args: ResolveInspectPathModeArgs) {
  const {
    mode,
    value,
    serializeLimit,
    makeSerializer,
    registerFunctionForInspect,
  } = args;

  if (mode === "serializeValue") {
    const serialize = makeSerializer({
      maxSerializeCalls: serializeLimit,
      maxDepth: 2,
      maxArrayLength: 100,
      maxObjectKeys: 100,
      maxMapEntries: 80,
      maxSetEntries: 80,
    });
    return {
      ok: true,
      value: serialize(value),
    };
  }

  if (typeof value !== "function") {
    return { ok: false, error: "선택 값이 함수가 아닙니다.", valueType: typeof value };
  }

  const inspectRefKey = registerFunctionForInspect(value);
  return { ok: true, name: value.name || "(anonymous)", inspectRefKey };
}

export { resolveInspectPathModeResponse };
