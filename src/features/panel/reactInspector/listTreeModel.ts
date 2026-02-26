import type { ReactComponentInfo } from '../../../shared/inspector/types';

/** visible component 인덱스를 parentId 기준 트리 맵으로 변환한다. */
export function buildChildrenByParent(
  reactComponents: ReactComponentInfo[],
  visibleIndices: number[],
  idToIndex: Map<string, number>,
): Map<string | null, number[]> {
  const visibleSet = new Set<number>(visibleIndices);
  const childrenByParent = new Map<string | null, number[]>();

  const pushChild = (parentId: string | null, componentIndex: number) => {
    const children = childrenByParent.get(parentId) ?? [];
    children.push(componentIndex);
    childrenByParent.set(parentId, children);
  };

  visibleIndices.forEach((componentIndex) => {
    const component = reactComponents[componentIndex];
    const parentId = component.parentId;
    if (!parentId) {
      pushChild(null, componentIndex);
      return;
    }

    const parentIndex = idToIndex.get(parentId);
    if (parentIndex === undefined || !visibleSet.has(parentIndex)) {
      pushChild(null, componentIndex);
      return;
    }
    pushChild(parentId, componentIndex);
  });

  return childrenByParent;
}
