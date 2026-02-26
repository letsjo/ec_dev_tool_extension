import { describe, expect, it } from 'vitest';
import { makeSerializer } from '../../src/content/pageAgentSerializationValue';
import { serializePropsForFiber } from '../../src/content/pageAgentSerializationProps';

describe('pageAgentSerializationValue/Props', () => {
  it('serializes circular references and function tokens', () => {
    const serialize = makeSerializer({
      maxSerializeCalls: 100,
      maxDepth: 4,
      maxArrayLength: 20,
      maxObjectKeys: 20,
      maxMapEntries: 20,
      maxSetEntries: 20,
    });

    const payload: Record<string, unknown> = {
      fn() {
        return 'ok';
      },
    };
    payload.self = payload;

    const result = serialize(payload) as Record<string, any>;
    expect(result.fn).toEqual({
      __ecType: 'function',
      name: 'fn',
    });
    expect(result.self.__ecType).toBe('circularRef');
    expect(typeof result.self.refId).toBe('number');
  });

  it('dehydrates nested values when depth limit is reached', () => {
    const serialize = makeSerializer({
      maxSerializeCalls: 100,
      maxDepth: 1,
      maxArrayLength: 20,
      maxObjectKeys: 20,
      maxMapEntries: 20,
      maxSetEntries: 20,
    });

    const result = serialize({ nested: { value: 1 } }) as Record<string, any>;
    expect(result.nested).toMatchObject({
      __ecType: 'dehydrated',
      reason: 'depth',
    });
  });

  it('serializes host fiber props with children summary and key truncation', () => {
    const props: Record<string, unknown> = {
      children: ['a', 'b', 'c'],
    };
    for (let i = 0; i < 110; i += 1) {
      props[`key_${i}`] = i;
    }

    const result = serializePropsForFiber(
      {
        tag: 5,
        memoizedProps: props,
      },
      (value: unknown) => value,
    ) as Record<string, any>;

    expect(Array.isArray(result.children)).toBe(true);
    expect(result.__truncated__).toBeDefined();
  });

  it('falls back to provided serializer for non-object props', () => {
    const serializeCalls: unknown[] = [];
    const value = serializePropsForFiber(
      {
        memoizedProps: 123,
      },
      (input: unknown) => {
        serializeCalls.push(input);
        return { wrapped: input };
      },
    );

    expect(value).toEqual({ wrapped: 123 });
    expect(serializeCalls).toEqual([123]);
  });
});
