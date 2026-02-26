import { describe, expect, it } from 'vitest';
import type { ReactComponentInfo } from '../../src/shared/inspector';
import {
  buildComponentSearchText,
  ensureComponentSearchTextCache,
  patchComponentSearchTextCacheAt,
} from '../../src/features/panel/reactInspector/searchTextCache';

function createComponent(overrides: Partial<ReactComponentInfo> = {}): ReactComponentInfo {
  return {
    id: 'cmp-1',
    parentId: null,
    name: 'ProfileCard',
    kind: 'function',
    depth: 0,
    props: {
      title: 'Alpha',
      count: 3,
    },
    hooks: [
      {
        name: 'State',
      },
    ],
    hookCount: 1,
    domSelector: '#profile',
    domPath: 'body > main > #profile',
    domTagName: 'section',
    ...overrides,
  };
}

describe('searchTextCache', () => {
  it('builds search text with metadata and data tokens', () => {
    const text = buildComponentSearchText(createComponent());

    expect(text).toContain('profilecard');
    expect(text).toContain('#profile');
    expect(text).toContain('alpha');
    expect(text).toContain('count');
  });

  it('keeps existing cache when query is empty and rebuilds on length mismatch', () => {
    const components = [createComponent(), createComponent({ id: 'cmp-2' })];
    const existing = ['cached-1'];

    const untouched = ensureComponentSearchTextCache(components, '', existing, true);
    expect(untouched).toBe(existing);

    const rebuilt = ensureComponentSearchTextCache(components, 'alpha', existing, true);
    expect(rebuilt).toHaveLength(2);
    expect(rebuilt[0]).toContain('alpha');
  });

  it('patches single component cache entry when detailed data arrives', () => {
    const components = [
      createComponent(),
      createComponent({
        id: 'cmp-2',
        props: {
          status: 'stale',
        },
      }),
    ];
    const cache = ['first', 'before'];

    components[1] = createComponent({
      id: 'cmp-2',
      props: {
        status: 'ready',
      },
    });

    patchComponentSearchTextCacheAt(components, cache, 1, true);
    expect(cache[1]).toContain('ready');

    const snapshot = cache[1];
    patchComponentSearchTextCacheAt(components, cache, 1, false);
    expect(cache[1]).toBe(snapshot);
  });
});
