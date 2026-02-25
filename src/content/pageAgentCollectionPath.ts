const MAP_ENTRY_PATH_SEGMENT_PREFIX = "__ec_map_entry__";
const MAP_VALUE_PATH_SEGMENT_PREFIX = "__ec_map_value__";
const SET_ENTRY_PATH_SEGMENT_PREFIX = "__ec_set_entry__";

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

/** inspectPath 특수 토큰을 실제 Map/Set 항목으로 해석한다. */
function resolveSpecialCollectionPathSegment(currentValue: unknown, segment: unknown) {
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

export { resolveSpecialCollectionPathSegment };
