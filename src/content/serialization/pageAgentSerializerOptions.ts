export type SerializerOptions = {
  maxSerializeCalls?: number;
  maxDepth?: number;
  maxArrayLength?: number;
  maxObjectKeys?: number;
  maxMapEntries?: number;
  maxSetEntries?: number;
};

export interface SerializerLimits {
  maxSerializeCalls: number;
  maxDepth: number;
  maxArrayLength: number;
  maxObjectKeys: number;
  maxMapEntries: number;
  maxSetEntries: number;
}

/** serializer 옵션 입력을 내부 한계값 객체로 정규화한다. */
export function resolveSerializerLimits(
  optionsOrMaxSerializeCalls: number | SerializerOptions,
): SerializerLimits {
  const normalizedOptions =
    typeof optionsOrMaxSerializeCalls === "number"
      ? { maxSerializeCalls: optionsOrMaxSerializeCalls }
      : optionsOrMaxSerializeCalls || {};

  return {
    maxSerializeCalls:
      typeof normalizedOptions.maxSerializeCalls === "number" &&
      normalizedOptions.maxSerializeCalls > 0
        ? normalizedOptions.maxSerializeCalls
        : 30000,
    maxDepth:
      typeof normalizedOptions.maxDepth === "number" && normalizedOptions.maxDepth >= 0
        ? Math.floor(normalizedOptions.maxDepth)
        : 4,
    maxArrayLength:
      typeof normalizedOptions.maxArrayLength === "number" &&
      normalizedOptions.maxArrayLength > 0
        ? Math.floor(normalizedOptions.maxArrayLength)
        : 120,
    maxObjectKeys:
      typeof normalizedOptions.maxObjectKeys === "number" &&
      normalizedOptions.maxObjectKeys > 0
        ? Math.floor(normalizedOptions.maxObjectKeys)
        : 140,
    maxMapEntries:
      typeof normalizedOptions.maxMapEntries === "number" &&
      normalizedOptions.maxMapEntries > 0
        ? Math.floor(normalizedOptions.maxMapEntries)
        : 120,
    maxSetEntries:
      typeof normalizedOptions.maxSetEntries === "number" &&
      normalizedOptions.maxSetEntries > 0
        ? Math.floor(normalizedOptions.maxSetEntries)
        : 120,
  };
}
