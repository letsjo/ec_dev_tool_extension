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
import { serializePrimitiveValue, serializeSpecialObjectValue } from "./pageAgentSerializationValuePrimitives";
import type { SerializationStrategyContext } from "./pageAgentSerializationStrategyTypes";

const OBJECT_CLASS_NAME_META_KEY = "__ecObjectClassName";

type SerializeValue = (value: unknown, depth?: number) => unknown;

/** maxDepth/maxSerializeCalls 제한을 포함하는 value serializer를 생성한다. */
function makeSerializer(optionsOrMaxSerializeCalls: number | SerializerOptions): SerializeValue {
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

  function serializeValue(value: unknown, depth?: number) {
    const level = typeof depth === "number" ? depth : 0;

    const primitive = serializePrimitiveValue(value);
    if (primitive.handled) {
      return primitive.value;
    }

    const objectValue = value as object;

    if (level >= MAX_DEPTH) {
      return buildDehydratedToken(objectValue, "depth");
    }

    if (limitReached) {
      return buildDehydratedToken(objectValue, "maxSerializeCalls");
    }
    serializeCalls += 1;
    if (serializeCalls > MAX_SERIALIZE_CALLS) {
      limitReached = true;
      return buildDehydratedToken(objectValue, "maxSerializeCalls");
    }

    const existingId = seenStore.findSeenId(objectValue);
    if (existingId !== null) {
      return {
        __ecType: "circularRef",
        refId: existingId,
      };
    }

    const specialObject = serializeSpecialObjectValue(objectValue);
    if (specialObject.handled) {
      return specialObject.value;
    }

    const id = nextId++;
    seenStore.rememberSeen(objectValue, id);

    try {
      const strategyContext: SerializationStrategyContext = {
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

      if (Array.isArray(objectValue)) {
        return serializeArrayValue(objectValue, id, level, strategyContext);
      }
      if (typeof Map !== "undefined" && objectValue instanceof Map) {
        return serializeMapValue(objectValue, id, level, strategyContext);
      }
      if (typeof Set !== "undefined" && objectValue instanceof Set) {
        return serializeSetValue(objectValue, id, level, strategyContext);
      }

      return serializeObjectValue(objectValue as Record<string, unknown>, id, level, strategyContext);
    } catch (_) {
      return String(objectValue);
    }
  }

  return serializeValue;
}

export { makeSerializer };
