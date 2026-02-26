import { describe, expect, it } from 'vitest';
import type { ReactComponentInfo } from '../../src/shared/inspector';
import {
  buildReactComponentDetailRenderSignature,
  buildReactComponentUpdateFingerprint,
  buildReactListRenderSignature,
} from '../../src/features/panel/reactInspector/signatures';

function createComponent(overrides?: Partial<ReactComponentInfo>): ReactComponentInfo {
  return {
    id: 'component-1',
    parentId: null,
    name: 'Component',
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

describe('signatures', () => {
  it('ignores internal meta keys when building update fingerprint', () => {
    const base = createComponent({
      props: { title: 'A', __ecRefId: 1, __ecObjectClassName: 'Object' },
      hooks: [{ value: 1, __ecRefId: 2 }],
    });
    const changedMetaOnly = createComponent({
      props: { title: 'A', __ecRefId: 999, __ecObjectClassName: 'CustomObject' },
      hooks: [{ value: 1, __ecRefId: 999 }],
    });

    expect(buildReactComponentUpdateFingerprint(changedMetaOnly)).toBe(
      buildReactComponentUpdateFingerprint(base),
    );
  });

  it('changes detail signature when props payload changes', () => {
    const before = createComponent({ props: { count: 1 } });
    const after = createComponent({ props: { count: 2 } });

    expect(buildReactComponentDetailRenderSignature(after)).not.toBe(
      buildReactComponentDetailRenderSignature(before),
    );
  });

  it('normalizes query casing and reflects collapsed/matched list state', () => {
    const reactComponents = [
      createComponent({ id: 'root', name: 'Root', depth: 0 }),
      createComponent({
        id: 'child',
        parentId: 'root',
        name: 'Child',
        depth: 1,
        domSelector: '.child',
      }),
    ];

    const baseSignature = buildReactListRenderSignature(
      reactComponents,
      ' Foo ',
      1,
      new Set<string>(),
      { visibleIndices: [0, 1], matchedIndices: [1] },
      new Set<number>([1]),
    );
    const collapsedSignature = buildReactListRenderSignature(
      reactComponents,
      'foo',
      1,
      new Set<string>(['root']),
      { visibleIndices: [0, 1], matchedIndices: [1] },
      new Set<number>([1]),
    );

    expect(baseSignature).not.toBe(collapsedSignature);
  });
});
