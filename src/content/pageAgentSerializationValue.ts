// @ts-nocheck
import { summarizeChildrenValue } from "./pageAgentSerializerSummary";
import { resolveSerializerLimits, type SerializerOptions } from "./pageAgentSerializerOptions";
import {
  serializeArrayValue,
  serializeMapValue,
  serializeObjectValue,
  serializeSetValue,
} from "./pageAgentSerializationStrategies";
import {
  buildDehydratedToken,
  createSeenReferenceStore,
  mapSerializerInternalKey,
  readObjectClassName,
} from "./pageAgentSerializationCore";

const OBJECT_CLASS_NAME_META_KEY = "__ecObjectClassName";

function serializePrimitiveValue(value: unknown) {
  const valueType = typeof value;
  if (value === null) return { handled: true, value: null };
  if (valueType === "undefined") return { handled: true, value: undefined };
  if (valueType === "string" || valueType === "number" || valueType === "boolean") {
    return { handled: true, value };
  }
  if (valueType === "bigint") return { handled: true, value: String(value) + "n" };
  if (valueType === "symbol") return { handled: true, value: String(value) };
  if (valueType === "function") {
    return {
      handled: true,
      value: {
        __ecType: "function",
        name: value.name || "",
      },
    };
  }
  if (valueType !== "object") return { handled: true, value: String(value) };
  return { handled: false, value: null };
}

function serializeSpecialObjectValue(value: unknown) {
  if (typeof Element !== "undefined" && value instanceof Element) {
    const elementName = String(value.tagName || "").toLowerCase();
    const suffix = value.id ? "#" + value.id : "";
    return { handled: true, value: "[Element " + elementName + suffix + "]" };
  }
  if (typeof Window !== "undefined" && value instanceof Window) {
    return { handled: true, value: "[Window]" };
  }
  return { handled: false, value: null };
}

/** maxDepth/maxSerializeCalls 제한을 포함하는 value serializer를 생성한다. */
function makeSerializer(optionsOrMaxSerializeCalls: number | SerializerOptions) {
  const seenStore = createSeenReferenceStore();
  let nextId = 1;

  const {
    maxSerializeCalls: MAX_SERIALIZE_CALLS,
    maxDepth: MAX_DEPTH,
    maxArrayLength: MAX_ARRAY_LENGTH,
    maxObjectKeys: MAX_OBJECT_KEYS,
    maxMapEntries: MAX_MAP_ENTRIES,
    maxSetEntries: MAX_SET_ENTRIES,
  } = resolveSerializerLimits(optionsOrMaxSerializeCalls);

  let serializeCalls = 0;
  let limitReached = false;

  function serializeValue(value: unknown, depth: number | undefined) {
    const level = typeof depth === "number" ? depth : 0;

    const primitive = serializePrimitiveValue(value);
    if (primitive.handled) {
      return primitive.value;
    }

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

    const existingId = seenStore.findSeenId(value);
    if (existingId !== null) {
      return {
        __ecType: "circularRef",
        refId: existingId,
      };
    }

    const specialObject = serializeSpecialObjectValue(value);
    if (specialObject.handled) {
      return specialObject.value;
    }

    const id = nextId++;
    seenStore.rememberSeen(value, id);

    try {
      const strategyContext = {
        serializeValue,
        isLimitReached: () => limitReached,
        mapInternalKey: mapSerializerInternalKey,
        summarizeChildrenValue,
        readObjectClassName,
        objectClassNameMetaKey: OBJECT_CLASS_NAME_META_KEY,
        maxArrayLength: MAX_ARRAY_LENGTH,
        maxObjectKeys: MAX_OBJECT_KEYS,
        maxMapEntries: MAX_MAP_ENTRIES,
        maxSetEntries: MAX_SET_ENTRIES,
      };

      if (Array.isArray(value)) {
        return serializeArrayValue(value, id, level, strategyContext);
      }
      if (typeof Map !== "undefined" && value instanceof Map) {
        return serializeMapValue(value, id, level, strategyContext);
      }
      if (typeof Set !== "undefined" && value instanceof Set) {
        return serializeSetValue(value, id, level, strategyContext);
      }

      return serializeObjectValue(value, id, level, strategyContext);
    } catch (error) {
      return String(value);
    }
  }

  return serializeValue;
}

export { makeSerializer };
