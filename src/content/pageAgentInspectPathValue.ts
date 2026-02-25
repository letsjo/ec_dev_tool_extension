type AnyRecord = Record<string, any>;
type PathSegment = string | number;

interface ResolveInspectPathValueArgs {
  initialValue: unknown;
  path: PathSegment[];
  resolveSpecialCollectionPathSegment: (currentValue: unknown, segment: string) => AnyRecord;
}

/** inspectPath path를 순회하며 collection token을 포함한 값을 해석한다. */
function resolveInspectPathValue(args: ResolveInspectPathValueArgs) {
  const {
    initialValue,
    path,
    resolveSpecialCollectionPathSegment,
  } = args;
  let value = initialValue;

  for (let i = 0; i < path.length; i += 1) {
    if (value == null) {
      return { ok: false, error: "함수 경로가 유효하지 않습니다.", failedAt: path[i] };
    }
    const segment = path[i] as PathSegment;
    const specialResolved = typeof segment === "string"
      ? resolveSpecialCollectionPathSegment(value, segment)
      : { handled: false };
    if (specialResolved.handled) {
      if (!specialResolved.ok) {
        return {
          ok: false,
          error: "함수 경로가 유효하지 않습니다.",
          reason: specialResolved.error || "collection path resolution failed",
          failedAt: segment,
        };
      }
      value = specialResolved.value;
      continue;
    }
    value = (value as AnyRecord)[segment as keyof AnyRecord];
  }

  return { ok: true, value };
}

export { resolveInspectPathValue };
