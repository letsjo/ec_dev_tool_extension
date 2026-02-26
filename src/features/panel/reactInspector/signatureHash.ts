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
export function hashValueForSignature(value: unknown, budget = 1200): string {
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
