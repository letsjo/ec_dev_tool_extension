import { describe, expect, it } from 'vitest';
import type { ReactComponentInfo } from '../../src/shared/inspector';
import {
  expandAncestorPaths,
  getComponentFilterResult,
  restoreCollapsedById,
  snapshotCollapsedIds,
} from '../../src/features/panel/reactInspector/searchFilter';

function createComponent(overrides: Partial<ReactComponentInfo> = {}): ReactComponentInfo {
  return {
    id: 'cmp-root',
    parentId: null,
    name: 'Root',
    kind: 'function',
    depth: 0,
    props: {},
    hooks: [],
    hookCount: 0,
    domSelector: null,
    domPath: null,
    domTagName: null,
    ...overrides,
  };
}

describe('searchFilter', () => {
  it('returns matched indices and keeps ancestor rows visible', () => {
    const components = [
      createComponent({ id: 'root', name: 'Root' }),
      createComponent({ id: 'child', parentId: 'root', name: 'ChildItem', depth: 1 }),
      createComponent({ id: 'leaf', parentId: 'child', name: 'LeafMatch', depth: 2 }),
    ];
    const texts = ['root', 'child item', 'leaf match'];

    const result = getComponentFilterResult(components, 'leaf', texts);

    expect(result.matchedIndices).toEqual([2]);
    expect(result.visibleIndices).toEqual([0, 1, 2]);
  });

  it('expands ancestors and restores only available collapsed ids', () => {
    const components = [
      createComponent({ id: 'root', name: 'Root' }),
      createComponent({ id: 'child', parentId: 'root', name: 'Child', depth: 1 }),
      createComponent({ id: 'leaf', parentId: 'child', name: 'Leaf', depth: 2 }),
    ];
    const collapsed = new Set<string>(['root', 'child', 'ghost']);

    expandAncestorPaths(components, [2], collapsed);
    expect(collapsed.has('root')).toBe(false);
    expect(collapsed.has('child')).toBe(false);

    const snapshot = snapshotCollapsedIds(components, collapsed);
    const restored = restoreCollapsedById(components, new Set<string>([...snapshot, 'ghost']));
    expect(restored.has('ghost')).toBe(false);
  });
});
