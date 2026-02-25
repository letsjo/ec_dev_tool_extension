import type {
  ComponentFilterResult,
  ReactComponentInfo,
} from '../../../shared/inspector/types';

/** FNV-1a 스타일로 문자열 토큰을 누적 해시한다. */
function updateHashString(hash: number, input: string): number {
  let next = hash >>> 0;
  for (let i = 0; i < input.length; i += 1) {
    next ^= input.charCodeAt(i);
    next = Math.imul(next, 16777619);
  }
  return next >>> 0;
}

/** 직렬화 메타 키는 시그니처 계산에서 제외한다. */
function isJsonInternalMetaKey(key: string): boolean {
  return key === '__ecRefId' || key === '__ecObjectClassName';
}

/** props/hooks 비교를 위한 제한 깊이 해시를 생성한다. */
function hashValueForSignature(value: unknown, budget = 1200): string {
  let hash = 2166136261 >>> 0;
  const visited = new WeakSet<object>();

  const walk = (current: unknown, depth: number) => {
    if (budget <= 0) {
      hash = updateHashString(hash, '<budget>');
      return;
    }
    budget -= 1;

    if (current === null) {
      hash = updateHashString(hash, 'null');
      return;
    }

    const currentType = typeof current;
    hash = updateHashString(hash, currentType);

    if (currentType === 'string') {
      hash = updateHashString(hash, String(current));
      return;
    }
    if (
      currentType === 'number' ||
      currentType === 'boolean' ||
      currentType === 'bigint' ||
      currentType === 'symbol'
    ) {
      hash = updateHashString(hash, String(current));
      return;
    }
    if (currentType !== 'object') {
      return;
    }

    const objectValue = current as object;
    if (visited.has(objectValue)) {
      hash = updateHashString(hash, '<cycle>');
      return;
    }
    visited.add(objectValue);

    if (depth > 7) {
      hash = updateHashString(hash, '<depth>');
      return;
    }

    if (Array.isArray(current)) {
      hash = updateHashString(hash, `arr:${current.length}`);
      const maxLen = Math.min(current.length, 48);
      for (let i = 0; i < maxLen; i += 1) {
        hash = updateHashString(hash, `i:${i}`);
        walk(current[i], depth + 1);
        if (budget <= 0) break;
      }
      return;
    }

    const entries = Object.entries(current as Record<string, unknown>);
    hash = updateHashString(hash, `obj:${entries.length}`);
    let scanned = 0;
    for (let i = 0; i < entries.length; i += 1) {
      const [key, child] = entries[i];
      if (isJsonInternalMetaKey(key)) continue;
      hash = updateHashString(hash, `k:${key}`);
      walk(child, depth + 1);
      scanned += 1;
      if (scanned >= 90) break;
      if (budget <= 0) break;
    }
  };

  walk(value, 0);
  return hash.toString(16);
}

/** 상세 패널 렌더 최소 변경 판별용 시그니처를 만든다. */
export function buildReactComponentDetailRenderSignature(component: ReactComponentInfo): string {
  return [
    component.id,
    component.name,
    component.kind,
    component.domSelector ?? '',
    component.domPath ?? '',
    String(component.hookCount),
    `p:${hashValueForSignature(component.props)}`,
    `h:${hashValueForSignature(component.hooks)}`,
  ].join('|');
}

/** 런타임 갱신에서 변경 컴포넌트를 찾기 위한 지문을 만든다. */
export function buildReactComponentUpdateFingerprint(
  component: ReactComponentInfo,
  metadataOnly = false,
): string {
  const baseParts = [
    component.id,
    component.parentId ?? '',
    component.name,
    component.kind,
    component.domSelector ?? '',
    component.domPath ?? '',
    String(component.hookCount),
  ];
  if (metadataOnly) {
    return baseParts.join('|');
  }
  return [
    ...baseParts,
    `p:${hashValueForSignature(component.props, 1600)}`,
    `h:${hashValueForSignature(component.hooks, 1600)}`,
  ].join('|');
}

/** 목록 렌더 영향 요소를 직렬화해 리스트 시그니처를 만든다. */
export function buildReactListRenderSignature(
  reactComponents: ReactComponentInfo[],
  componentSearchQuery: string,
  selectedReactComponentIndex: number,
  collapsedComponentIds: ReadonlySet<string>,
  filterResult: ComponentFilterResult,
  matchedIndexSet: ReadonlySet<number>,
): string {
  const parts: string[] = [
    componentSearchQuery.trim().toLowerCase(),
    `sel:${selectedReactComponentIndex}`,
    `visible:${filterResult.visibleIndices.length}`,
    `matched:${filterResult.matchedIndices.length}`,
  ];

  filterResult.visibleIndices.forEach((index) => {
    const component = reactComponents[index];
    const matchFlag = matchedIndexSet.has(index) ? '1' : '0';
    const collapsedFlag = collapsedComponentIds.has(component.id) ? '1' : '0';
    parts.push(
      [
        String(index),
        component.id,
        component.parentId ?? '',
        component.name,
        component.kind,
        String(component.depth),
        component.domSelector ? 'dom' : 'no-dom',
        matchFlag,
        collapsedFlag,
      ].join(':'),
    );
  });

  return parts.join('\u001f');
}
