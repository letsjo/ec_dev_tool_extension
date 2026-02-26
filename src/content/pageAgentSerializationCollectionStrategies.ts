import type { SerializationStrategyContext } from './pageAgentSerializationStrategyTypes';

type AnyRecord = Record<string, any>;

/** 배열 값을 직렬화하고 한도 초과 상태를 __truncated__ 토큰으로 반영한다. */
function serializeArrayValue(
  value: unknown[],
  id: number,
  level: number,
  context: SerializationStrategyContext,
) {
  const arr: unknown[] = [];
  try {
    (arr as AnyRecord).__ecRefId = id;
  } catch (_) {}

  const maxLen = Math.min(value.length, context.maxArrayLength);
  for (let i = 0; i < maxLen; i += 1) {
    arr.push(context.serializeValue(value[i], level + 1));
    if (context.isLimitReached()) break;
  }

  const serializedLen = arr.length;
  if (value.length > serializedLen) {
    arr.push('[+' + String(value.length - serializedLen) + ' more]');
  } else if (context.isLimitReached()) {
    arr.push('[TruncatedBySerializeLimit]');
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
    __ecType: 'map',
    size: value.size,
    entries: [],
  };
  try {
    out.__ecRefId = id;
  } catch (_) {}

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
    out.__truncated__ = '[+' + String(value.size - out.entries.length) + ' entries]';
  } else if (context.isLimitReached()) {
    out.__truncated__ = '[TruncatedBySerializeLimit]';
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
    __ecType: 'set',
    size: value.size,
    entries: [],
  };
  try {
    out.__ecRefId = id;
  } catch (_) {}

  const maxEntries = Math.min(value.size, context.maxSetEntries);
  let entryIndex = 0;
  for (const entryValue of value) {
    if (entryIndex >= maxEntries) break;
    out.entries.push(context.serializeValue(entryValue, level + 1));
    entryIndex += 1;
    if (context.isLimitReached()) break;
  }

  if (value.size > out.entries.length) {
    out.__truncated__ = '[+' + String(value.size - out.entries.length) + ' entries]';
  } else if (context.isLimitReached()) {
    out.__truncated__ = '[TruncatedBySerializeLimit]';
  }

  return out;
}

export { serializeArrayValue, serializeMapValue, serializeSetValue };
