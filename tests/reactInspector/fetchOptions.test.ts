import { describe, expect, it } from 'vitest';
import {
  createElementSelectionFetchOptions,
  createRuntimeRefreshFetchOptions,
} from '../../src/features/panel/reactInspector/fetchOptions';

describe('reactInspector fetchOptions presets', () => {
  it('disables auto highlight for element selection preset', () => {
    const options = createElementSelectionFetchOptions();
    expect(options).toMatchObject({
      lightweight: true,
      serializeSelectedComponent: false,
      highlightSelection: false,
      refreshDetail: true,
    });
  });

  it('keeps runtime refresh preset with no highlight/scroll side effects', () => {
    const options = createRuntimeRefreshFetchOptions(true);
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
});
