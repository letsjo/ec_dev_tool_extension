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

export type { SerializationStrategyContext };
