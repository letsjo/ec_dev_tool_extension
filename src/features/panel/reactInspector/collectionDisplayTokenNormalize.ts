import { isMapToken, isRecord, isSetToken } from '../../../shared/inspector';
import {
  attachDisplayCollectionMeta,
  attachDisplayPathMap,
  makeMapEntryPathSegment,
  makeSetEntryPathSegment,
  type DisplayPathMap,
} from './collectionDisplayMeta';

/** 값을 읽어 검증/변환 */
export function readMapTokenEntryPair(entry: unknown): { key: unknown; value: unknown } {
  if (Array.isArray(entry)) {
    return {
      key: entry.length > 0 ? entry[0] : undefined,
      value: entry.length > 1 ? entry[1] : undefined,
    };
  }
  if (isRecord(entry) && ('key' in entry || 'value' in entry)) {
    return {
      key: 'key' in entry ? entry.key : undefined,
      value: 'value' in entry ? entry.value : undefined,
    };
  }
  return { key: undefined, value: entry };
}

/** 해당 기능 흐름을 처리 */
function mapTokenToDisplayEntriesArray(value: unknown): unknown[] {
  const out: unknown[] = [];
  if (!isMapToken(value)) return out;

  /** Map을 [key, value] 배열로 변환해 key가 객체/함수여도 구조를 보존한다. */
  const rawEntries = Array.isArray(value.entries) ? value.entries : [];
  const pathMap: DisplayPathMap = {};

  for (let i = 0; i < rawEntries.length; i += 1) {
    const pair = readMapTokenEntryPair(rawEntries[i]);
    out.push([pair.key, pair.value]);
    pathMap[String(i)] = makeMapEntryPathSegment(i);
  }

  const size =
    typeof value.size === 'number' && Number.isFinite(value.size)
      ? Math.max(0, Math.floor(value.size))
      : rawEntries.length;
  if (size > rawEntries.length) {
    out.push(`[+${size - rawEntries.length} more entries]`);
  }
  attachDisplayPathMap(out, pathMap);
  attachDisplayCollectionMeta(out, 'map', size);
  return out;
}

/** UI 상태 또는 문구를 설정 */
function setTokenToDisplayArray(value: unknown): unknown[] {
  if (!isSetToken(value)) return [];
  const rawEntries = Array.isArray(value.entries) ? value.entries : [];
  const out = rawEntries.slice();
  const size =
    typeof value.size === 'number' && Number.isFinite(value.size)
      ? Math.max(0, Math.floor(value.size))
      : rawEntries.length;
  const pathMap: DisplayPathMap = {};
  for (let i = 0; i < out.length; i += 1) {
    pathMap[String(i)] = makeSetEntryPathSegment(i);
  }
  attachDisplayPathMap(out, pathMap);
  attachDisplayCollectionMeta(out, 'set', size);
  return out;
}

/** 입력 데이터를 표시/비교용으로 정규화 */
export function normalizeCollectionTokenForDisplay(value: unknown): unknown {
  /** serializer 토큰(map/set)을 UI 친화적인 컬렉션 형태로 변환한다. */
  if (isMapToken(value)) return mapTokenToDisplayEntriesArray(value);
  if (isSetToken(value)) return setTokenToDisplayArray(value);
  return value;
}
