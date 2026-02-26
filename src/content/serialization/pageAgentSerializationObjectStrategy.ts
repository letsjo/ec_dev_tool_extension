import type { SerializationStrategyContext } from './pageAgentSerializationStrategyTypes';

type AnyRecord = Record<string, any>;

/** 일반 객체를 키 기준으로 직렬화하고 React 내부 키/children 특수 규칙을 적용한다. */
function serializeObjectValue(
  value: AnyRecord,
  id: number,
  level: number,
  context: SerializationStrategyContext,
) {
  const out: AnyRecord = {};
  try {
    out.__ecRefId = id;
  } catch (_) {}

  const keys = Object.keys(value);
  const maxKeys = Math.min(keys.length, context.maxObjectKeys);
  for (let j = 0; j < maxKeys; j += 1) {
    const key = keys[j];
    const internalReplacement = context.mapInternalKey(key);
    if (internalReplacement) {
      out[key] = internalReplacement;
      continue;
    }

    if (key === 'children') {
      try {
        out.children = context.summarizeChildrenValue(value[key]);
      } catch (error: any) {
        out.children = '[Thrown: ' + String(error && error.message) + ']';
      }
      continue;
    }

    try {
      out[key] = context.serializeValue(value[key], level + 1);
    } catch (error: any) {
      out[key] = '[Thrown: ' + String(error && error.message) + ']';
    }

    if (context.isLimitReached()) break;
  }

  if (keys.length > maxKeys) {
    out.__truncated__ = '[+' + String(keys.length - maxKeys) + ' keys]';
  } else if (context.isLimitReached()) {
    out.__truncated__ = '[TruncatedBySerializeLimit]';
  }

  const objectClassName = context.readObjectClassName(value);
  if (objectClassName) {
    out[context.objectClassNameMetaKey] = objectClassName;
  }

  return out;
}

export { serializeObjectValue };
