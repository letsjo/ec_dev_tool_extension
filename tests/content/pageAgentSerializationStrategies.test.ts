import { describe, expect, it } from 'vitest';
import {
  serializeArrayValue,
  serializeMapValue,
  serializeObjectValue,
  serializeSetValue,
} from '../../src/content/serialization/pageAgentSerializationStrategies';

type AnyRecord = Record<string, any>;

function createContext(overrides: Partial<AnyRecord> = {}) {
  return {
    serializeValue: (value: unknown) => value,
    isLimitReached: () => false,
    mapInternalKey: (_key: string) => null,
    summarizeChildrenValue: (value: unknown) => value,
    readObjectClassName: (_value: unknown) => null,
    objectClassNameMetaKey: '__ecObjectClassName',
    maxArrayLength: 100,
    maxObjectKeys: 100,
    maxMapEntries: 80,
    maxSetEntries: 80,
    ...overrides,
  };
}

describe('pageAgentSerializationStrategies', () => {
  it('serializes arrays with length truncation marker', () => {
    const context = createContext({
      maxArrayLength: 2,
    });

    const out = serializeArrayValue([1, 2, 3], 10, 0, context);

    expect(Array.from(out)).toEqual([1, 2, '[+1 more]']);
    expect((out as AnyRecord).__ecRefId).toBe(10);
  });

  it('adds serialize-limit truncation marker for arrays', () => {
    const context = createContext({
      maxArrayLength: 1,
      isLimitReached: () => true,
    });

    const out = serializeArrayValue(['only'], 11, 0, context);

    expect(Array.from(out)).toEqual(['only', '[TruncatedBySerializeLimit]']);
  });

  it('serializes map and set entries with truncation metadata', () => {
    const mapContext = createContext({
      maxMapEntries: 2,
    });
    const mapOut = serializeMapValue(
      new Map([
        ['a', 1],
        ['b', 2],
        ['c', 3],
      ]),
      12,
      0,
      mapContext,
    );
    expect(mapOut.entries).toEqual([
      ['a', 1],
      ['b', 2],
    ]);
    expect(mapOut.__truncated__).toBe('[+1 entries]');

    const setContext = createContext({
      maxSetEntries: 3,
      isLimitReached: () => true,
    });
    const setOut = serializeSetValue(new Set(['x']), 13, 0, setContext);
    expect(setOut.entries).toEqual(['x']);
    expect(setOut.__truncated__).toBe('[TruncatedBySerializeLimit]');
  });

  it('serializes object keys with internal mapping and error guards', () => {
    const context = createContext({
      serializeValue: (value: unknown) => {
        if (value === 'throw-me') throw new Error('serialize failed');
        return `serialized:${String(value)}`;
      },
      mapInternalKey: (key: string) => (key.startsWith('__react') ? '[Internal React Value]' : null),
      summarizeChildrenValue: () => 'children-summary',
      readObjectClassName: () => 'CustomModel',
    });

    const out = serializeObjectValue(
      {
        __reactFiber: 'internal',
        children: ['ignored'],
        normal: 'ok',
        broken: 'throw-me',
      },
      99,
      0,
      context,
    );

    expect(out.__reactFiber).toBe('[Internal React Value]');
    expect(out.children).toBe('children-summary');
    expect(out.normal).toBe('serialized:ok');
    expect(out.broken).toBe('[Thrown: serialize failed]');
    expect(out.__ecObjectClassName).toBe('CustomModel');
    expect(out.__ecRefId).toBe(99);
  });
});
