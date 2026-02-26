import { describe, expect, it } from 'vitest';
import type { ReactComponentInfo } from '../../src/shared/inspector/types';
import { buildChildrenByParent } from '../../src/features/panel/reactInspector/listTreeModel';

function createComponent(
  id: string,
  parentId: string | null,
  depth: number,
  name = 'Component',
): ReactComponentInfo {
  return {
    id,
    parentId,
    name,
    kind: 'function',
    depth,
    props: {},
    hooks: [],
    hookCount: 0,
    domSelector: null,
    domPath: null,
    domTagName: null,
  };
}

describe('buildChildrenByParent', () => {
  it('groups visible children by visible parent id', () => {
    const reactComponents = [
      createComponent('root', null, 0),
      createComponent('child', 'root', 1),
      createComponent('orphan', 'missing-parent', 1),
    ];
    const visibleIndices = [0, 1, 2];
    const idToIndex = new Map<string, number>([
      ['root', 0],
      ['child', 1],
      ['orphan', 2],
    ]);

    const childrenByParent = buildChildrenByParent(
      reactComponents,
      visibleIndices,
      idToIndex,
    );

    expect(childrenByParent.get('root')).toEqual([1]);
    expect(childrenByParent.get(null)).toEqual([0, 2]);
  });

  it('treats child as root when parent is not visible', () => {
    const reactComponents = [
      createComponent('root', null, 0),
      createComponent('child', 'root', 1),
    ];
    const visibleIndices = [1];
    const idToIndex = new Map<string, number>([
      ['root', 0],
      ['child', 1],
    ]);

    const childrenByParent = buildChildrenByParent(
      reactComponents,
      visibleIndices,
      idToIndex,
    );

    expect(childrenByParent.get(null)).toEqual([1]);
    expect(childrenByParent.get('root')).toBeUndefined();
  });
});
