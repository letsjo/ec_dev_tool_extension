import { describe, expect, it } from 'vitest';
import {
  formatHookInlinePrimitive,
  formatPrimitive,
  readDehydratedPreviewText,
} from '../../src/features/panel/reactInspector/jsonPreviewPrimitive';

describe('jsonPreviewPrimitive', () => {
  it('formats primitive values for json summary previews', () => {
    expect(formatPrimitive('alpha')).toBe('"alpha"');
    expect(formatPrimitive('<Button />')).toBe('<Button />');
    expect(formatPrimitive(10n)).toBe('10');
    expect(formatPrimitive(Symbol.for('id'))).toBe('Symbol(id)');
    expect(formatPrimitive(undefined)).toBe('undefined');
  });

  it('formats hook inline primitive values with shorter string budget', () => {
    expect(formatHookInlinePrimitive('value')).toBe('"value"');
    expect(formatHookInlinePrimitive('<Item />')).toBe('<Item />');
    expect(formatHookInlinePrimitive(false)).toBe('false');
    expect(formatHookInlinePrimitive({ key: 'value' })).toBeNull();
  });

  it('reads dehydrated fallback preview text from value type and size', () => {
    expect(readDehydratedPreviewText({ __ecType: 'dehydrated', valueType: 'map', size: 5 })).toBe(
      'Map(5)',
    );
    expect(
      readDehydratedPreviewText({ __ecType: 'dehydrated', valueType: 'array', size: -1 }),
    ).toBe('Array(0)');
    expect(readDehydratedPreviewText({ plain: true })).toBe('{…}');
  });
});
