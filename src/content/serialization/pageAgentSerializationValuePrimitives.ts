interface SerializationHandledResult {
  handled: true;
  value: unknown;
}

interface SerializationUnhandledResult {
  handled: false;
  value: null;
}

type SerializationProbeResult = SerializationHandledResult | SerializationUnhandledResult;

function serializePrimitiveValue(value: unknown): SerializationProbeResult {
  const valueType = typeof value;
  if (value === null) return { handled: true, value: null };
  if (valueType === 'undefined') return { handled: true, value: undefined };
  if (valueType === 'string' || valueType === 'number' || valueType === 'boolean') {
    return { handled: true, value };
  }
  if (valueType === 'bigint') return { handled: true, value: `${String(value)}n` };
  if (valueType === 'symbol') return { handled: true, value: String(value) };
  if (valueType === 'function') {
    const functionValue = value as { name?: string };
    return {
      handled: true,
      value: {
        __ecType: 'function',
        name: functionValue.name || '',
      },
    };
  }
  if (valueType !== 'object') return { handled: true, value: String(value) };
  return { handled: false, value: null };
}

function serializeSpecialObjectValue(value: unknown): SerializationProbeResult {
  if (typeof Element !== 'undefined' && value instanceof Element) {
    const elementName = String(value.tagName || '').toLowerCase();
    const suffix = value.id ? `#${value.id}` : '';
    return { handled: true, value: `[Element ${elementName}${suffix}]` };
  }
  if (typeof Window !== 'undefined' && value instanceof Window) {
    return { handled: true, value: '[Window]' };
  }
  return { handled: false, value: null };
}

export { serializePrimitiveValue, serializeSpecialObjectValue };
export type { SerializationProbeResult };
