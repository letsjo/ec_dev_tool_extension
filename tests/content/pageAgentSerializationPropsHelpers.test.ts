import { describe, expect, it } from 'vitest';
import { resolveFiberPropsBudget } from '../../src/content/pageAgentSerializationPropsBudget';
import { serializePropsObjectEntries } from '../../src/content/pageAgentSerializationPropsEntries';

describe('pageAgentSerializationProps helpers', () => {
  it('resolves host/non-host fiber props budgets', () => {
    expect(resolveFiberPropsBudget(5, 400)).toEqual({
      maxKeys: 100,
      perKeySerializeBudget: 7000,
    });
    expect(resolveFiberPropsBudget(0, 400)).toEqual({
      maxKeys: 180,
      perKeySerializeBudget: 18000,
    });
    expect(resolveFiberPropsBudget(undefined, 10)).toEqual({
      maxKeys: 10,
      perKeySerializeBudget: 18000,
    });
  });

  it('serializes props entries with children summary and truncation', () => {
    const out = serializePropsObjectEntries(
      {
        children: ['a', 'b', 'c'],
        value: 123,
      },
      {
        maxKeys: 1,
        perKeySerializeBudget: 200,
      },
    );

    expect(Array.isArray(out.children)).toBe(true);
    expect(out.__truncated__).toBe('[+1 keys]');
  });

  it('guards thrown getters while serializing prop values', () => {
    const props: Record<string, unknown> = {};
    Object.defineProperty(props, 'broken', {
      enumerable: true,
      get() {
        throw new Error('nope');
      },
    });

    const out = serializePropsObjectEntries(props, {
      maxKeys: 10,
      perKeySerializeBudget: 200,
    });

    expect(out.broken).toBe('[Thrown: nope]');
  });
});
