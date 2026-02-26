import { describe, expect, it } from 'vitest';
import {
  serializePrimitiveValue,
  serializeSpecialObjectValue,
} from '../../src/content/pageAgentSerializationValuePrimitives';

describe('pageAgentSerializationValuePrimitives', () => {
  it('serializes primitive/function tokens and leaves objects unhandled', () => {
    expect(serializePrimitiveValue(null)).toEqual({ handled: true, value: null });
    expect(serializePrimitiveValue(undefined)).toEqual({ handled: true, value: undefined });
    expect(serializePrimitiveValue('text')).toEqual({ handled: true, value: 'text' });
    expect(serializePrimitiveValue(42)).toEqual({ handled: true, value: 42 });
    expect(serializePrimitiveValue(true)).toEqual({ handled: true, value: true });
    expect(serializePrimitiveValue(10n)).toEqual({ handled: true, value: '10n' });
    expect(serializePrimitiveValue(Symbol.for('s'))).toEqual({ handled: true, value: 'Symbol(s)' });

    const functionToken = serializePrimitiveValue(function namedFn() {});
    expect(functionToken).toEqual({
      handled: true,
      value: {
        __ecType: 'function',
        name: 'namedFn',
      },
    });

    expect(serializePrimitiveValue({ key: 'value' })).toEqual({ handled: false, value: null });
  });

  it('serializes special Element/Window objects', () => {
    const plainObject = serializeSpecialObjectValue({ key: 'value' });
    expect(plainObject).toEqual({ handled: false, value: null });

    const div = document.createElement('div');
    div.id = 'node-id';
    expect(serializeSpecialObjectValue(div)).toEqual({
      handled: true,
      value: '[Element div#node-id]',
    });

    const originalWindowCtor = (globalThis as { Window?: unknown }).Window;
    class FakeWindow {}
    (globalThis as { Window?: unknown }).Window = FakeWindow;
    try {
      expect(serializeSpecialObjectValue(new FakeWindow())).toEqual({
        handled: true,
        value: '[Window]',
      });
    } finally {
      (globalThis as { Window?: unknown }).Window = originalWindowCtor;
    }
  });
});
