import { describe, expect, it } from 'vitest';
import {
  buildDehydratedToken,
  createSeenReferenceStore,
  mapSerializerInternalKey,
  readObjectClassName,
} from '../../src/content/serialization/pageAgentSerializationCore';

describe('pageAgentSerializationCore', () => {
  it('maps React internal keys to readable placeholder values', () => {
    expect(mapSerializerInternalKey('_owner')).toBe('[ReactOwner]');
    expect(mapSerializerInternalKey('__source')).toBe('[ReactInternal]');
    expect(mapSerializerInternalKey('children')).toBeNull();
  });

  it('reads custom class names and skips plain objects', () => {
    class CustomPayload {}

    expect(readObjectClassName(new CustomPayload())).toBe('CustomPayload');
    expect(readObjectClassName({ key: 1 })).toBeNull();
    expect(readObjectClassName(null)).toBeNull();
  });

  it('builds dehydrated tokens by value type', () => {
    class CustomPayload {
      value = 1;
    }

    const arrayToken = buildDehydratedToken([1, 2, 3], 'depth');
    expect(arrayToken).toEqual({
      __ecType: 'dehydrated',
      valueType: 'array',
      size: 3,
      preview: 'Array(3)',
      reason: 'depth',
    });

    const mapToken = buildDehydratedToken(new Map([[1, 'a']]), 'maxSerializeCalls');
    expect(mapToken.preview).toBe('Map(1)');
    expect(mapToken.valueType).toBe('map');

    const objectToken = buildDehydratedToken(new CustomPayload(), 'depth');
    expect(objectToken).toEqual({
      __ecType: 'dehydrated',
      valueType: 'object',
      size: 1,
      preview: 'CustomPayload(1)',
      reason: 'depth',
    });
  });

  it('tracks seen reference ids for circular serialization', () => {
    const seenStore = createSeenReferenceStore();
    const value = { id: 'alpha' };

    expect(seenStore.findSeenId(value)).toBeNull();
    seenStore.rememberSeen(value, 42);
    expect(seenStore.findSeenId(value)).toBe(42);
  });
});
