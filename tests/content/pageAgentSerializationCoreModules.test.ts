import { describe, expect, it } from 'vitest';
import { mapSerializerInternalKey } from '../../src/content/serialization/pageAgentSerializationCoreInternalKey';
import {
  buildDehydratedToken,
  readObjectClassName,
} from '../../src/content/serialization/pageAgentSerializationCoreDehydrated';
import { createSeenReferenceStore } from '../../src/content/serialization/pageAgentSerializationCoreSeenStore';

describe('pageAgentSerializationCore modules', () => {
  it('maps internal react keys to readable placeholders', () => {
    expect(mapSerializerInternalKey('_owner')).toBe('[ReactOwner]');
    expect(mapSerializerInternalKey('__source')).toBe('[ReactInternal]');
    expect(mapSerializerInternalKey('children')).toBeNull();
  });

  it('builds dehydrated token with custom class preview', () => {
    class ViewModel {
      id = 1;
      name = 'alpha';
    }

    const value = new ViewModel();
    expect(readObjectClassName(value)).toBe('ViewModel');

    const token = buildDehydratedToken(value, 'depth');
    expect(token).toEqual({
      __ecType: 'dehydrated',
      valueType: 'object',
      size: 2,
      preview: 'ViewModel(2)',
      reason: 'depth',
    });
  });

  it('stores and resolves seen object ids', () => {
    const seenStore = createSeenReferenceStore();
    const payload = { key: 'value' };

    expect(seenStore.findSeenId(payload)).toBeNull();
    seenStore.rememberSeen(payload, 77);
    expect(seenStore.findSeenId(payload)).toBe(77);
  });
});
