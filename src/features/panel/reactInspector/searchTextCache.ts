import {
  isCircularRefToken,
  isDehydratedToken,
  isFunctionToken,
} from '../../../shared/inspector';
import type { ReactComponentInfo } from '../../../shared/inspector';

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
    typeof value.size === 'number' && Number.isFinite(value.size)
      ? `(${Math.max(0, Math.floor(value.size))})`
      : '';
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

/** 검색어가 있을 때만 캐시 길이를 검사해 필요 시 재생성한다. */
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

/** 상세 데이터가 늦게 도착한 단일 컴포넌트 인덱스만 캐시를 부분 갱신한다. */
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
