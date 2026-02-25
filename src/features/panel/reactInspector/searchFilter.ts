import type {
  ComponentFilterResult,
  ReactComponentInfo,
} from '../../../shared/inspector/types';

/** 검색어 기준으로 매치/가시 인덱스를 계산한다. */
export function getComponentFilterResult(
  reactComponents: ReactComponentInfo[],
  componentSearchQuery: string,
  componentSearchTexts: string[],
): ComponentFilterResult {
  const normalized = componentSearchQuery.trim().toLowerCase();
  if (!normalized) {
    return {
      visibleIndices: reactComponents.map((_, index) => index),
      matchedIndices: reactComponents.map((_, index) => index),
    };
  }

  const terms = normalized.split(/\s+/).filter(Boolean);
  if (terms.length === 0) {
    return {
      visibleIndices: reactComponents.map((_, index) => index),
      matchedIndices: reactComponents.map((_, index) => index),
    };
  }

  const matchedIndices: number[] = [];
  for (let index = 0; index < reactComponents.length; index += 1) {
    const haystack = componentSearchTexts[index] ?? '';
    const matched = terms.every((term) => haystack.includes(term));
    if (matched) matchedIndices.push(index);
  }

  if (matchedIndices.length === 0) {
    return { visibleIndices: [], matchedIndices: [] };
  }

  const idToIndex = buildComponentIndexById(reactComponents);
  const visibleSet = new Set<number>();
  matchedIndices.forEach((matchIndex) => {
    let currentIndex: number | undefined = matchIndex;
    let guard = 0;
    while (currentIndex !== undefined && guard < 220) {
      if (visibleSet.has(currentIndex)) break;
      visibleSet.add(currentIndex);

      const parentId = reactComponents[currentIndex].parentId;
      if (!parentId) break;
      currentIndex = idToIndex.get(parentId);
      guard += 1;
    }
  });

  const visibleIndices = reactComponents
    .map((_, index) => index)
    .filter((index) => visibleSet.has(index));

  return { visibleIndices, matchedIndices };
}

/** 컴포넌트 id -> 인덱스 맵을 생성한다. */
export function buildComponentIndexById(
  reactComponents: ReactComponentInfo[],
): Map<string, number> {
  const idToIndex = new Map<string, number>();
  reactComponents.forEach((component, index) => {
    idToIndex.set(component.id, index);
  });
  return idToIndex;
}

/** 선택/검색 매치의 모든 조상 경로를 펼치도록 접힘 상태를 해제한다. */
function expandAncestorPath(
  reactComponents: ReactComponentInfo[],
  index: number,
  idToIndex: Map<string, number>,
  collapsedComponentIds: Set<string>,
) {
  let parentId = reactComponents[index]?.parentId ?? null;
  let guard = 0;
  while (parentId && guard < 220) {
    collapsedComponentIds.delete(parentId);
    const parentIndex = idToIndex.get(parentId);
    if (parentIndex === undefined) break;
    parentId = reactComponents[parentIndex].parentId;
    guard += 1;
  }
}

/** 여러 인덱스에 대해 조상 펼침을 일괄 적용한다. */
export function expandAncestorPaths(
  reactComponents: ReactComponentInfo[],
  indices: number[],
  collapsedComponentIds: Set<string>,
) {
  if (indices.length === 0) return;
  const idToIndex = buildComponentIndexById(reactComponents);
  indices.forEach((index) => {
    expandAncestorPath(reactComponents, index, idToIndex, collapsedComponentIds);
  });
}

/** 현재 접힘 id 집합을 스냅샷으로 복사한다. */
export function snapshotCollapsedIds(
  reactComponents: ReactComponentInfo[],
  collapsedComponentIds: ReadonlySet<string>,
): Set<string> {
  if (collapsedComponentIds.size === 0 || reactComponents.length === 0) {
    return new Set<string>();
  }

  return new Set<string>(collapsedComponentIds);
}

/** 현재 컴포넌트 목록에 존재하는 id만 골라 접힘 상태를 복원한다. */
export function restoreCollapsedById(
  reactComponents: ReactComponentInfo[],
  ids: ReadonlySet<string>,
): Set<string> {
  const restored = new Set<string>();
  if (ids.size === 0 || reactComponents.length === 0) return restored;

  const availableIds = new Set<string>(reactComponents.map((component) => component.id));
  ids.forEach((id) => {
    if (availableIds.has(id)) {
      restored.add(id);
    }
  });
  return restored;
}
