/** 필요한 값/상태를 계산해 반환 */
function getReactLikeTypeName(type: unknown): string {
  if (!type) return "Unknown";
  if (typeof type === "string") return type;
  if (typeof type === "function") {
    const fnType = type as { displayName?: string; name?: string };
    return fnType.displayName || fnType.name || "Anonymous";
  }
  if (typeof type === "object") {
    const objectType = type as {
      displayName?: unknown;
      render?: { displayName?: string; name?: string };
      type?: unknown;
    };
    if (typeof objectType.displayName === "string" && objectType.displayName) {
      return objectType.displayName;
    }
    if (typeof objectType.render === "function") {
      const render = objectType.render as { displayName?: string; name?: string };
      return render.displayName || render.name || "Anonymous";
    }
    if (objectType.type) return getReactLikeTypeName(objectType.type);
  }
  return "Unknown";
}

/** children 렌더값을 compact 구조로 요약 직렬화한다. */
function summarizeChildrenValue(value: unknown, depth?: number): unknown {
  const level = typeof depth === "number" ? depth : 0;
  if (value == null) return value;
  if (typeof value === "string") return value.length > 120 ? value.slice(0, 120) + "…" : value;
  if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") {
    return value;
  }
  if (typeof value === "function") return "[Function " + (value.name || "") + "]";

  if (Array.isArray(value)) {
    if (level >= 2) return "[ChildrenArray len=" + String(value.length) + "]";
    const maxLen = Math.min(value.length, 6);
    const arr: unknown[] = [];
    for (let i = 0; i < maxLen; i += 1) {
      arr.push(summarizeChildrenValue(value[i], level + 1));
    }
    if (value.length > maxLen) {
      arr.push("[+" + String(value.length - maxLen) + " more]");
    }
    return arr;
  }

  if (typeof value === "object") {
    const objectValue = value as Record<string, unknown>;
    if (objectValue.$$typeof && ("type" in objectValue || "props" in objectValue)) {
      const typeName = getReactLikeTypeName(objectValue.type);
      const keyText = objectValue.key == null ? "" : " key=" + String(objectValue.key);
      return "[ReactElement " + typeName + keyText + "]";
    }

    if (level >= 2) return "[ChildrenObject]";

    const out: Record<string, unknown> = {};
    const keys = Object.keys(objectValue);
    const maxKeys = Math.min(keys.length, 4);
    for (let j = 0; j < maxKeys; j += 1) {
      const key = keys[j];
      if (
        key === "_owner"
        || key === "_store"
        || key === "__self"
        || key === "__source"
        || key === "_debugOwner"
        || key === "_debugSource"
      ) {
        out[key] = key === "_owner" ? "[ReactOwner]" : "[ReactInternal]";
        continue;
      }
      try {
        out[key] = summarizeChildrenValue(objectValue[key], level + 1);
      } catch (error) {
        const typedError = error as { message?: unknown } | null;
        out[key] = "[Thrown: " + String(typedError && typedError.message) + "]";
      }
    }
    if (keys.length > maxKeys) out.__truncated__ = "[+" + String(keys.length - maxKeys) + " keys]";
    return out;
  }

  return String(value);
}

export { getReactLikeTypeName, summarizeChildrenValue };
