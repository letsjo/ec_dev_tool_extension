// @ts-nocheck
import {
  getReactLikeTypeName,
  summarizeChildrenValue,
} from "./pageAgentSerializerSummary";
import {
  resolveSerializerLimits,
  type SerializerOptions,
} from "./pageAgentSerializerOptions";
import {
  serializeArrayValue,
  serializeMapValue,
  serializeObjectValue,
  serializeSetValue,
} from "./pageAgentSerializationStrategies";

type AnyRecord = Record<string, any>;

type FiberLike = AnyRecord & {
  tag?: number;
  memoizedProps?: any;
};

const OBJECT_CLASS_NAME_META_KEY = "__ecObjectClassName";

export { resolveSpecialCollectionPathSegment } from "./pageAgentCollectionPath";

/** 해당 기능 흐름을 처리 */
export function makeSerializer(optionsOrMaxSerializeCalls: number | SerializerOptions) {
  const seenMap = typeof WeakMap === "function" ? new WeakMap() : null;
  const seenList = [];
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
      const strategyContext = {
        serializeValue,
        isLimitReached: () => limitReached,
        mapInternalKey,
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
