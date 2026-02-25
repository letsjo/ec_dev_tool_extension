// @ts-nocheck
type AnyRecord = Record<string, any>;
type SerializerOptions = {
  maxSerializeCalls?: number;
  maxDepth?: number;
  maxArrayLength?: number;
  maxObjectKeys?: number;
  maxMapEntries?: number;
  maxSetEntries?: number;
};

type FiberLike = AnyRecord & {
  tag?: number;
  memoizedProps?: any;
};

const MAP_ENTRY_PATH_SEGMENT_PREFIX = "__ec_map_entry__";
const MAP_VALUE_PATH_SEGMENT_PREFIX = "__ec_map_value__";
const SET_ENTRY_PATH_SEGMENT_PREFIX = "__ec_set_entry__";
const OBJECT_CLASS_NAME_META_KEY = "__ecObjectClassName";

/** 해당 기능 흐름을 처리 */
function parseCollectionPathIndex(segment: unknown, prefix: string) {
  if (typeof segment !== "string") return null;
  if (segment.indexOf(prefix) !== 0) return null;
  const raw = segment.slice(prefix.length);
  if (!/^\d+$/.test(raw)) return -1;
  const index = Number(raw);
  if (!Number.isFinite(index) || index < 0) return -1;
  return Math.floor(index);
}

/** 필요한 값/상태를 계산해 반환 */
function getMapValueAtIndex(mapValue: Map<unknown, unknown>, index: number) {
  let cursor = 0;
  for (const [, entryValue] of mapValue) {
    if (cursor === index) return { ok: true, value: entryValue };
    cursor += 1;
  }
  return { ok: false, error: "Map entry index out of range" };
}

/** 필요한 값/상태를 계산해 반환 */
function getMapEntryAtIndex(mapValue: Map<unknown, unknown>, index: number) {
  let cursor = 0;
  for (const [entryKey, entryValue] of mapValue) {
    if (cursor === index) return { ok: true, value: [entryKey, entryValue] };
    cursor += 1;
  }
  return { ok: false, error: "Map entry index out of range" };
}

/** 필요한 값/상태를 계산해 반환 */
function getSetValueAtIndex(setValue: Set<unknown>, index: number) {
  let cursor = 0;
  for (const entryValue of setValue) {
    if (cursor === index) return { ok: true, value: entryValue };
    cursor += 1;
  }
  return { ok: false, error: "Set entry index out of range" };
}

/** inspectPath 특수 토큰(__ec_map_entry__/__ec_map_value__/__ec_set_entry__)을 실제 컬렉션 항목으로 해석한다. */
export function resolveSpecialCollectionPathSegment(currentValue: unknown, segment: unknown) {
  if (typeof Map !== "undefined" && currentValue instanceof Map) {
    const mapEntryIndex = parseCollectionPathIndex(segment, MAP_ENTRY_PATH_SEGMENT_PREFIX);
    if (mapEntryIndex !== null) {
      if (mapEntryIndex < 0) {
        return { handled: true, ok: false, error: "Invalid map entry segment" };
      }
      const resolved = getMapEntryAtIndex(currentValue, mapEntryIndex);
      if (!resolved.ok) {
        return { handled: true, ok: false, error: resolved.error };
      }
      return { handled: true, ok: true, value: resolved.value };
    }

    const mapValueIndex = parseCollectionPathIndex(segment, MAP_VALUE_PATH_SEGMENT_PREFIX);
    if (mapValueIndex !== null) {
      if (mapValueIndex < 0) {
        return { handled: true, ok: false, error: "Invalid map entry segment" };
      }
      const resolved = getMapValueAtIndex(currentValue, mapValueIndex);
      if (!resolved.ok) {
        return { handled: true, ok: false, error: resolved.error };
      }
      return { handled: true, ok: true, value: resolved.value };
    }
  }

  if (typeof Set !== "undefined" && currentValue instanceof Set) {
    const setEntryIndex = parseCollectionPathIndex(segment, SET_ENTRY_PATH_SEGMENT_PREFIX);
    if (setEntryIndex !== null) {
      if (setEntryIndex < 0) {
        return { handled: true, ok: false, error: "Invalid set entry segment" };
      }
      const resolved = getSetValueAtIndex(currentValue, setEntryIndex);
      if (!resolved.ok) {
        return { handled: true, ok: false, error: resolved.error };
      }
      return { handled: true, ok: true, value: resolved.value };
    }
  }

  return { handled: false };
}

/** 필요한 값/상태를 계산해 반환 */
function getReactLikeTypeName(type: unknown) {
  if (!type) return "Unknown";
  if (typeof type === "string") return type;
  if (typeof type === "function") return type.displayName || type.name || "Anonymous";
  if (typeof type === "object") {
    if (typeof type.displayName === "string" && type.displayName) return type.displayName;
    if (typeof type.render === "function") return type.render.displayName || type.render.name || "Anonymous";
    if (type.type) return getReactLikeTypeName(type.type);
  }
  return "Unknown";
}

/** 해당 기능 흐름을 처리 */
function summarizeChildrenValue(value: unknown, depth: number | undefined) {
  const level = typeof depth === "number" ? depth : 0;
  if (value == null) return value;
  if (typeof value === "string") return value.length > 120 ? value.slice(0, 120) + "…" : value;
  if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") return value;
  if (typeof value === "function") return "[Function " + (value.name || "") + "]";

  if (Array.isArray(value)) {
    if (level >= 2) return "[ChildrenArray len=" + String(value.length) + "]";
    const maxLen = Math.min(value.length, 6);
    const arr = [];
    for (let i = 0; i < maxLen; i += 1) {
      arr.push(summarizeChildrenValue(value[i], level + 1));
    }
    if (value.length > maxLen) {
      arr.push("[+" + String(value.length - maxLen) + " more]");
    }
    return arr;
  }

  if (typeof value === "object") {
    if (value.$$typeof && ("type" in value || "props" in value)) {
      const typeName = getReactLikeTypeName(value.type);
      const keyText = value.key == null ? "" : " key=" + String(value.key);
      return "[ReactElement " + typeName + keyText + "]";
    }

    if (level >= 2) return "[ChildrenObject]";

    const out = {};
    const keys = Object.keys(value);
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
        out[key] = summarizeChildrenValue(value[key], level + 1);
      } catch (e) {
        out[key] = "[Thrown: " + String(e && e.message) + "]";
      }
    }
    if (keys.length > maxKeys) out.__truncated__ = "[+" + String(keys.length - maxKeys) + " keys]";
    return out;
  }

  return String(value);
}

/** 해당 기능 흐름을 처리 */
export function makeSerializer(optionsOrMaxSerializeCalls: number | SerializerOptions) {
  const seenMap = typeof WeakMap === "function" ? new WeakMap() : null;
  const seenList = [];
  let nextId = 1;

  const normalizedOptions =
    typeof optionsOrMaxSerializeCalls === "number"
      ? { maxSerializeCalls: optionsOrMaxSerializeCalls }
      : (optionsOrMaxSerializeCalls || {});

  const MAX_SERIALIZE_CALLS =
    typeof normalizedOptions.maxSerializeCalls === "number" &&
    normalizedOptions.maxSerializeCalls > 0
      ? normalizedOptions.maxSerializeCalls
      : 30000;
  const MAX_DEPTH =
    typeof normalizedOptions.maxDepth === "number" && normalizedOptions.maxDepth >= 0
      ? Math.floor(normalizedOptions.maxDepth)
      : 4;
  const MAX_ARRAY_LENGTH =
    typeof normalizedOptions.maxArrayLength === "number" &&
    normalizedOptions.maxArrayLength > 0
      ? Math.floor(normalizedOptions.maxArrayLength)
      : 120;
  const MAX_OBJECT_KEYS =
    typeof normalizedOptions.maxObjectKeys === "number" && normalizedOptions.maxObjectKeys > 0
      ? Math.floor(normalizedOptions.maxObjectKeys)
      : 140;
  const MAX_MAP_ENTRIES =
    typeof normalizedOptions.maxMapEntries === "number" && normalizedOptions.maxMapEntries > 0
      ? Math.floor(normalizedOptions.maxMapEntries)
      : 120;
  const MAX_SET_ENTRIES =
    typeof normalizedOptions.maxSetEntries === "number" && normalizedOptions.maxSetEntries > 0
      ? Math.floor(normalizedOptions.maxSetEntries)
      : 120;

  let serializeCalls = 0;
  let limitReached = false;

  function mapInternalKey(key: string) {
    if (key === "_owner") return "[ReactOwner]";
    if (
      key === "_store"
      || key === "__self"
      || key === "__source"
      || key === "_debugOwner"
      || key === "_debugSource"
    ) {
      return "[ReactInternal]";
    }
    return null;
  }

  function findSeenId(value: object) {
    if (seenMap) {
      const idFromMap = seenMap.get(value);
      return typeof idFromMap === "number" ? idFromMap : null;
    }
    for (let i = 0; i < seenList.length; i += 1) {
      if (seenList[i].value === value) return seenList[i].id;
    }
    return null;
  }

  function rememberSeen(value: object, id: number) {
    if (seenMap) {
      seenMap.set(value, id);
      return;
    }
    seenList.push({ value, id });
  }

  function buildDehydratedToken(value: unknown, reason: string) {
    try {
      if (Array.isArray(value)) {
        return {
          __ecType: "dehydrated",
          valueType: "array",
          size: value.length,
          preview: "Array(" + String(value.length) + ")",
          reason,
        };
      }
      if (typeof Map !== "undefined" && value instanceof Map) {
        return {
          __ecType: "dehydrated",
          valueType: "map",
          size: value.size,
          preview: "Map(" + String(value.size) + ")",
          reason,
        };
      }
      if (typeof Set !== "undefined" && value instanceof Set) {
        return {
          __ecType: "dehydrated",
          valueType: "set",
          size: value.size,
          preview: "Set(" + String(value.size) + ")",
          reason,
        };
      }
      if (value && typeof value === "object") {
        let keyCount = 0;
        try {
          keyCount = Object.keys(value).length;
        } catch (_) {
          keyCount = 0;
        }
        const className = readObjectClassName(value);
        const displayName = className || "Object";
        return {
          __ecType: "dehydrated",
          valueType: "object",
          size: keyCount,
          preview: displayName + "(" + String(keyCount) + ")",
          reason,
        };
      }
    } catch (_) {}

    return {
      __ecType: "dehydrated",
      valueType: "unknown",
      preview: "{…}",
      reason,
    };
  }

  function readObjectClassName(value: unknown): string | null {
    if (!value || typeof value !== "object") return null;
    try {
      const proto = Object.getPrototypeOf(value);
      if (!proto || proto === Object.prototype) return null;
      const ctor = proto.constructor;
      if (!ctor || typeof ctor !== "function") return null;
      const name = typeof ctor.name === "string" ? ctor.name.trim() : "";
      if (!name || name === "Object") return null;
      return name;
    } catch (_) {
      return null;
    }
  }

  function serializeValue(value: unknown, depth: number | undefined) {
    const level = typeof depth === "number" ? depth : 0;
    if (value === null) return null;

    const t = typeof value;
    if (t === "undefined") return undefined;
    if (t === "string" || t === "number" || t === "boolean") return value;
    if (t === "bigint") return String(value) + "n";
    if (t === "symbol") return String(value);
    if (t === "function") {
      return {
        __ecType: "function",
        name: value.name || "",
      };
    }
    if (t !== "object") return String(value);

    if (level >= MAX_DEPTH) {
      return buildDehydratedToken(value, "depth");
    }

    if (limitReached) {
      return buildDehydratedToken(value, "maxSerializeCalls");
    }
    serializeCalls += 1;
    if (serializeCalls > MAX_SERIALIZE_CALLS) {
      limitReached = true;
      return buildDehydratedToken(value, "maxSerializeCalls");
    }

    const existingId = findSeenId(value);
    if (existingId !== null) {
      return {
        __ecType: "circularRef",
        refId: existingId,
      };
    }

    if (typeof Element !== "undefined" && value instanceof Element) {
      const elementName = String(value.tagName || "").toLowerCase();
      const suffix = value.id ? "#" + value.id : "";
      return "[Element " + elementName + suffix + "]";
    }
    if (typeof Window !== "undefined" && value instanceof Window) return "[Window]";

    const id = nextId++;
    rememberSeen(value, id);

    try {
      if (Array.isArray(value)) {
        const arr = [];
        try { arr.__ecRefId = id; } catch (_) {}
        const maxLen = Math.min(value.length, MAX_ARRAY_LENGTH);
        for (let i = 0; i < maxLen; i += 1) {
          arr.push(serializeValue(value[i], level + 1));
          if (limitReached) break;
        }
        const serializedLen = arr.length;
        if (value.length > serializedLen) {
          arr.push("[+" + String(value.length - serializedLen) + " more]");
        } else if (limitReached) {
          arr.push("[TruncatedBySerializeLimit]");
        }
        return arr;
      }

      if (typeof Map !== "undefined" && value instanceof Map) {
        const out = {
          __ecType: "map",
          size: value.size,
          entries: [],
        };
        try { out.__ecRefId = id; } catch (_) {}
        const maxEntries = Math.min(value.size, MAX_MAP_ENTRIES);
        let entryIndex = 0;
        for (const [entryKey, entryValue] of value) {
          if (entryIndex >= maxEntries) break;
          out.entries.push([
            serializeValue(entryKey, level + 1),
            serializeValue(entryValue, level + 1),
          ]);
          entryIndex += 1;
          if (limitReached) break;
        }
        if (value.size > out.entries.length) {
          out.__truncated__ = "[+" + String(value.size - out.entries.length) + " entries]";
        } else if (limitReached) {
          out.__truncated__ = "[TruncatedBySerializeLimit]";
        }
        return out;
      }

      if (typeof Set !== "undefined" && value instanceof Set) {
        const out = {
          __ecType: "set",
          size: value.size,
          entries: [],
        };
        try { out.__ecRefId = id; } catch (_) {}
        const maxEntries = Math.min(value.size, MAX_SET_ENTRIES);
        let entryIndex = 0;
        for (const entryValue of value) {
          if (entryIndex >= maxEntries) break;
          out.entries.push(serializeValue(entryValue, level + 1));
          entryIndex += 1;
          if (limitReached) break;
        }
        if (value.size > out.entries.length) {
          out.__truncated__ = "[+" + String(value.size - out.entries.length) + " entries]";
        } else if (limitReached) {
          out.__truncated__ = "[TruncatedBySerializeLimit]";
        }
        return out;
      }

      const out = {};
      try { out.__ecRefId = id; } catch (_) {}
      const keys = Object.keys(value);
      const maxKeys = Math.min(keys.length, MAX_OBJECT_KEYS);
      for (let j = 0; j < maxKeys; j += 1) {
        const key = keys[j];
        const internalReplacement = mapInternalKey(key);
        if (internalReplacement) {
          out[key] = internalReplacement;
          continue;
        }
        if (key === "children") {
          try {
            out.children = summarizeChildrenValue(value[key]);
          } catch (e3) {
            out.children = "[Thrown: " + String(e3 && e3.message) + "]";
          }
          continue;
        }
        try {
          out[key] = serializeValue(value[key], level + 1);
        } catch (e) {
          out[key] = "[Thrown: " + String(e && e.message) + "]";
        }
        if (limitReached) break;
      }
      if (keys.length > maxKeys) {
        out.__truncated__ = "[+" + String(keys.length - maxKeys) + " keys]";
      } else if (limitReached) {
        out.__truncated__ = "[TruncatedBySerializeLimit]";
      }
      const objectClassName = readObjectClassName(value);
      if (objectClassName) {
        out[OBJECT_CLASS_NAME_META_KEY] = objectClassName;
      }
      return out;
    } catch (e2) {
      return String(value);
    }
  }

  return serializeValue;
}

/** 해당 기능 흐름을 처리 */
export function serializePropsForFiber(fiber: FiberLike | null | undefined, serialize: (value: unknown, depth?: number) => unknown) {
  const props = fiber ? fiber.memoizedProps : null;
  if (props && typeof props === "object" && !Array.isArray(props)) {
    const out = {};
    const keys = Object.keys(props);
    const isHostFiber = fiber && fiber.tag === 5;
    const maxKeys = Math.min(keys.length, isHostFiber ? 100 : 180);
    const perKeyBudget = isHostFiber ? 7000 : 18000;

    for (let i = 0; i < maxKeys; i += 1) {
      const key = keys[i];
      if (key === "children") {
        try {
          out.children = summarizeChildrenValue(props.children);
        } catch (e) {
          out.children = "[Thrown: " + String(e && e.message) + "]";
        }
        continue;
      }
      try {
        const propSerialize = makeSerializer({
          maxSerializeCalls: perKeyBudget,
          maxDepth: 2,
          maxArrayLength: 80,
          maxObjectKeys: 80,
          maxMapEntries: 60,
          maxSetEntries: 60,
        });
        out[key] = propSerialize(props[key]);
      } catch (e2) {
        out[key] = "[Thrown: " + String(e2 && e2.message) + "]";
      }
    }
    if (keys.length > maxKeys) out.__truncated__ = "[+" + String(keys.length - maxKeys) + " keys]";
    return out;
  }
  return serialize(props);
}
