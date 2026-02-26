import { describe, expect, it } from 'vitest';
import {
  createElementSelectionFetchOptions,
  createRuntimeRefreshFetchOptions,
} from '../../src/features/panel/reactInspector/fetchOptions';

describe('reactInspector fetchOptions presets', () => {
  it('keeps auto highlight for element selection preset in lite mode', () => {
    const options = createElementSelectionFetchOptions('lite');
    expect(options).toMatchObject({
      lightweight: true,
      serializeSelectedComponent: false,
      highlightSelection: true,
      refreshDetail: true,
    });
  });

  it('supports full payload mode for element selection preset', () => {
    const options = createElementSelectionFetchOptions('full');
    expect(options).toMatchObject({
      lightweight: false,
      serializeSelectedComponent: false,
      highlightSelection: true,
      refreshDetail: true,
    });
  });

  it('keeps runtime refresh preset with no highlight/scroll side effects in lite mode', () => {
    const options = createRuntimeRefreshFetchOptions(true, 'lite');
    expect(options).toMatchObject({
      keepLookup: true,
      background: true,
      preserveSelection: true,
      preserveCollapsed: true,
      highlightSelection: false,
      scrollSelectionIntoView: false,
      expandSelectionAncestors: false,
      lightweight: true,
      serializeSelectedComponent: false,
      trackUpdates: true,
      refreshDetail: false,
    });
  });

  it('supports full payload mode in runtime refresh preset', () => {
    const options = createRuntimeRefreshFetchOptions(true, 'full');
    expect(options).toMatchObject({
      keepLookup: true,
      background: true,
      lightweight: false,
      serializeSelectedComponent: false,
    });
  });
});
