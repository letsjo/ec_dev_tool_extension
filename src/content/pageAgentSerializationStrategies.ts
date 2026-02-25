type AnyRecord = Record<string, any>;

interface SerializationStrategyContext {
  serializeValue: (value: unknown, depth?: number) => unknown;
  isLimitReached: () => boolean;
  mapInternalKey: (key: string) => string | null;
  summarizeChildrenValue: (value: unknown) => unknown;
  readObjectClassName: (value: unknown) => string | null;
  objectClassNameMetaKey: string;
  maxArrayLength: number;
  maxObjectKeys: number;
  maxMapEntries: number;
  maxSetEntries: number;
}

/** 배열 값을 직렬화하고 한도 초과 상태를 __truncated__ 토큰으로 반영한다. */
function serializeArrayValue(
  value: unknown[],
  id: number,
  level: number,
  context: SerializationStrategyContext,
) {
  const arr: unknown[] = [];
  try { (arr as AnyRecord).__ecRefId = id; } catch (_) {}
  const maxLen = Math.min(value.length, context.maxArrayLength);
  for (let i = 0; i < maxLen; i += 1) {
    arr.push(context.serializeValue(value[i], level + 1));
    if (context.isLimitReached()) break;
  }
  const serializedLen = arr.length;
  if (value.length > serializedLen) {
    arr.push("[+" + String(value.length - serializedLen) + " more]");
  } else if (context.isLimitReached()) {
    arr.push("[TruncatedBySerializeLimit]");
  }
  return arr;
}

/** Map 값을 [key, value] entry 배열로 직렬화한다. */
function serializeMapValue(
  value: Map<unknown, unknown>,
  id: number,
  level: number,
  context: SerializationStrategyContext,
) {
  const out: AnyRecord = {
    __ecType: "map",
    size: value.size,
    entries: [],
  };
  try { out.__ecRefId = id; } catch (_) {}
  const maxEntries = Math.min(value.size, context.maxMapEntries);
  let entryIndex = 0;
  for (const [entryKey, entryValue] of value) {
    if (entryIndex >= maxEntries) break;
    out.entries.push([
      context.serializeValue(entryKey, level + 1),
      context.serializeValue(entryValue, level + 1),
    ]);
    entryIndex += 1;
    if (context.isLimitReached()) break;
  }
  if (value.size > out.entries.length) {
    out.__truncated__ = "[+" + String(value.size - out.entries.length) + " entries]";
  } else if (context.isLimitReached()) {
    out.__truncated__ = "[TruncatedBySerializeLimit]";
  }
  return out;
}

/** Set 값을 entry 배열로 직렬화한다. */
function serializeSetValue(
  value: Set<unknown>,
  id: number,
  level: number,
  context: SerializationStrategyContext,
) {
  const out: AnyRecord = {
    __ecType: "set",
    size: value.size,
    entries: [],
  };
  try { out.__ecRefId = id; } catch (_) {}
  const maxEntries = Math.min(value.size, context.maxSetEntries);
  let entryIndex = 0;
  for (const entryValue of value) {
    if (entryIndex >= maxEntries) break;
    out.entries.push(context.serializeValue(entryValue, level + 1));
    entryIndex += 1;
    if (context.isLimitReached()) break;
  }
  if (value.size > out.entries.length) {
    out.__truncated__ = "[+" + String(value.size - out.entries.length) + " entries]";
  } else if (context.isLimitReached()) {
    out.__truncated__ = "[TruncatedBySerializeLimit]";
  }
  return out;
}

/** 일반 객체를 키 기준으로 직렬화하고 React 내부 키/children 특수 규칙을 적용한다. */
function serializeObjectValue(
  value: AnyRecord,
  id: number,
  level: number,
  context: SerializationStrategyContext,
) {
  const out: AnyRecord = {};
  try { out.__ecRefId = id; } catch (_) {}
  const keys = Object.keys(value);
  const maxKeys = Math.min(keys.length, context.maxObjectKeys);
  for (let j = 0; j < maxKeys; j += 1) {
    const key = keys[j];
    const internalReplacement = context.mapInternalKey(key);
    if (internalReplacement) {
      out[key] = internalReplacement;
      continue;
    }
    if (key === "children") {
      try {
        out.children = context.summarizeChildrenValue(value[key]);
      } catch (e3: any) {
        out.children = "[Thrown: " + String(e3 && e3.message) + "]";
      }
      continue;
    }
    try {
      out[key] = context.serializeValue(value[key], level + 1);
    } catch (e: any) {
      out[key] = "[Thrown: " + String(e && e.message) + "]";
    }
    if (context.isLimitReached()) break;
  }
  if (keys.length > maxKeys) {
    out.__truncated__ = "[+" + String(keys.length - maxKeys) + " keys]";
  } else if (context.isLimitReached()) {
    out.__truncated__ = "[TruncatedBySerializeLimit]";
  }
  const objectClassName = context.readObjectClassName(value);
  if (objectClassName) {
    out[context.objectClassNameMetaKey] = objectClassName;
  }
  return out;
}

export {
  serializeArrayValue,
  serializeMapValue,
  serializeObjectValue,
  serializeSetValue,
};
