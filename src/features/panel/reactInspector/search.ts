import {
  isCircularRefToken,
  isDehydratedToken,
  isFunctionToken,
} from '../../../shared/inspector/guards';
import type {
  ComponentFilterResult,
  ReactComponentInfo,
} from '../../../shared/inspector/types';

/** 직렬화 메타 키는 검색 토큰 수집에서 제외한다. */
function isJsonInternalMetaKey(key: string): boolean {
  return key === '__ecRefId' || key === '__ecObjectClassName';
}

/** dehydrated 토큰을 검색 가능한 미리보기 텍스트로 변환한다. */
function readDehydratedPreviewText(value: unknown): string {
  if (!isDehydratedToken(value)) return '{…}';
  if (typeof value.preview === 'string' && value.preview.trim()) {
    return value.preview;
  }
  const sizeText =
    typeof value.size === 'number' && Number.isFinite(value.size) ? `(${Math.max(0, Math.floor(value.size))})` : '';
  if (value.valueType === 'array') return `Array${sizeText}`;
  if (value.valueType === 'map') return `Map${sizeText}`;
  if (value.valueType === 'set') return `Set${sizeText}`;
  if (value.valueType === 'object') return `Object${sizeText}`;
  return '{…}';
}

/** props/hooks를 제한 깊이로 순회해 검색 토큰을 수집한다. */
function collectSearchTokens(
  value: unknown,
  output: string[],
  budget: { remaining: number },
  depth = 0,
) {
  if (budget.remaining <= 0 || depth > 3) return;
  if (value == null) return;

  if (typeof value === 'string') {
    output.push(value);
    budget.remaining -= 1;
    return;
  }
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
    output.push(String(value));
    budget.remaining -= 1;
    return;
  }
  if (isFunctionToken(value)) {
    output.push(value.name ?? 'function');
    budget.remaining -= 1;
    return;
  }
  if (isCircularRefToken(value)) {
    output.push(`ref${value.refId}`);
    budget.remaining -= 1;
    return;
  }
  if (isDehydratedToken(value)) {
    output.push(readDehydratedPreviewText(value));
    if (typeof value.reason === 'string' && value.reason) {
      output.push(value.reason);
    }
    budget.remaining -= 1;
    return;
  }
  if (typeof value !== 'object') return;

  if (Array.isArray(value)) {
    const maxLen = Math.min(value.length, 40);
    for (let i = 0; i < maxLen; i += 1) {
      collectSearchTokens(value[i], output, budget, depth + 1);
      if (budget.remaining <= 0) break;
    }
    return;
  }

  const entries = Object.entries(value as Record<string, unknown>);
  const filteredEntries = entries.filter(([key]) => !isJsonInternalMetaKey(key));
  const maxLen = Math.min(filteredEntries.length, 48);
  for (let i = 0; i < maxLen; i += 1) {
    const [key, child] = filteredEntries[i];
    output.push(key);
    budget.remaining -= 1;
    if (budget.remaining <= 0) break;
    collectSearchTokens(child, output, budget, depth + 1);
    if (budget.remaining <= 0) break;
  }
}

/** 컴포넌트 검색에 사용할 정규화 텍스트를 생성한다. */
export function buildComponentSearchText(
  component: ReactComponentInfo,
  includeDataTokens = true,
): string {
  const tokens: string[] = [
    component.name,
    component.kind,
    component.domTagName ?? '',
    component.domSelector ?? '',
    component.domPath ?? '',
  ];
  if (!includeDataTokens) {
    return tokens.join(' ').toLowerCase();
  }
  const budget = { remaining: 220 };
  collectSearchTokens(component.props, tokens, budget);
  collectSearchTokens(component.hooks, tokens, budget);
  return tokens.join(' ').toLowerCase();
}

/** 현재 컴포넌트 목록 기준으로 검색 텍스트 캐시를 새로 생성한다. */
export function buildComponentSearchTexts(
  reactComponents: ReactComponentInfo[],
  includeDataTokens = true,
): string[] {
  return reactComponents.map((component) => buildComponentSearchText(component, includeDataTokens));
}

/**
 * 검색어가 있을 때만 캐시 길이를 검사해 필요 시 재생성한다.
 * 검색어가 비어 있으면 기존 캐시를 그대로 유지해 불필요한 직렬화 순회를 피한다.
 */
export function ensureComponentSearchTextCache(
  reactComponents: ReactComponentInfo[],
  componentSearchQuery: string,
  componentSearchTexts: string[],
  includeDataTokens = true,
): string[] {
  if (!componentSearchQuery.trim()) return componentSearchTexts;
  if (componentSearchTexts.length === reactComponents.length) {
    return componentSearchTexts;
  }
  return buildComponentSearchTexts(reactComponents, includeDataTokens);
}

/**
 * 상세 데이터가 뒤늦게 도착한 단일 컴포넌트 인덱스만 캐시를 부분 갱신한다.
 * includeDataTokens=false인 경량 모드에서는 캐시를 갱신하지 않는다.
 */
export function patchComponentSearchTextCacheAt(
  reactComponents: ReactComponentInfo[],
  componentSearchTexts: string[],
  componentIndex: number,
  includeDataTokens: boolean,
) {
  if (!includeDataTokens) return;
  if (componentSearchTexts.length !== reactComponents.length) return;
  const component = reactComponents[componentIndex];
  if (!component) return;
  componentSearchTexts[componentIndex] = buildComponentSearchText(component, true);
}

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

  const idToIndex = new Map<string, number>();
  reactComponents.forEach((component, index) => {
    idToIndex.set(component.id, index);
  });

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
