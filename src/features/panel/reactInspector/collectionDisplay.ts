import { isMapToken, isRecord, isSetToken } from '../../../shared/inspector/guards';
import type { JsonPathSegment } from '../../../shared/inspector/types';

const MAP_ENTRY_PATH_SEGMENT_PREFIX = '__ec_map_entry__';
const SET_ENTRY_PATH_SEGMENT_PREFIX = '__ec_set_entry__';
const DISPLAY_PATH_MAP_KEY = '__ecDisplayPathMap';
const DISPLAY_COLLECTION_TYPE_KEY = '__ecDisplayCollectionType';
const DISPLAY_COLLECTION_SIZE_KEY = '__ecDisplayCollectionSize';

type DisplayPathMap = Record<string, JsonPathSegment>;
type DisplayCollectionType = 'map' | 'set';

export interface DisplayCollectionMeta {
  type: DisplayCollectionType;
  size: number;
}

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
function makeMapEntryPathSegment(index: number): string {
  return `${MAP_ENTRY_PATH_SEGMENT_PREFIX}${index}`;
}

/** 해당 기능 흐름을 처리 */
function makeSetEntryPathSegment(index: number): string {
  return `${SET_ENTRY_PATH_SEGMENT_PREFIX}${index}`;
}

/** 해당 기능 흐름을 처리 */
function attachDisplayPathMap(target: object, pathMap: DisplayPathMap) {
  try {
    /** UI key/index와 inspected page 실제 경로를 연결한다. */
    Object.defineProperty(target, DISPLAY_PATH_MAP_KEY, {
      value: pathMap,
      enumerable: false,
      configurable: true,
      writable: false,
    });
  } catch (_) {
    /** 확장 불가능한 객체는 매핑을 붙이지 않고 건너뛴다. */
  }
}

/** 해당 기능 흐름을 처리 */
function attachDisplayCollectionMeta(
  target: object,
  collectionType: DisplayCollectionType,
  size: number,
) {
  const normalizedSize =
    Number.isFinite(size) && size >= 0 ? Math.max(0, Math.floor(size)) : 0;
  try {
    Object.defineProperty(target, DISPLAY_COLLECTION_TYPE_KEY, {
      value: collectionType,
      enumerable: false,
      configurable: true,
      writable: false,
    });
    Object.defineProperty(target, DISPLAY_COLLECTION_SIZE_KEY, {
      value: normalizedSize,
      enumerable: false,
      configurable: true,
      writable: false,
    });
  } catch (_) {
    /** 확장 불가능한 객체는 메타를 붙이지 않고 건너뛴다. */
  }
}

/** 값을 읽어 검증/변환 */
export function readDisplayCollectionMeta(value: unknown): DisplayCollectionMeta | null {
  if (!value || (typeof value !== 'object' && typeof value !== 'function')) return null;
  if (!(DISPLAY_COLLECTION_TYPE_KEY in (value as object))) return null;

  const typeRaw = (value as Record<string, unknown>)[DISPLAY_COLLECTION_TYPE_KEY];
  const sizeRaw = (value as Record<string, unknown>)[DISPLAY_COLLECTION_SIZE_KEY];
  if (typeRaw !== 'map' && typeRaw !== 'set') return null;

  const normalizedSize =
    typeof sizeRaw === 'number' && Number.isFinite(sizeRaw) && sizeRaw >= 0
      ? Math.max(0, Math.floor(sizeRaw))
      : 0;
  return {
    type: typeRaw,
    size: normalizedSize,
  };
}

/** 값을 읽어 검증/변환 */
function readDisplayPathMap(value: unknown): DisplayPathMap | null {
  if (!value || (typeof value !== 'object' && typeof value !== 'function')) return null;
  if (!(DISPLAY_PATH_MAP_KEY in (value as object))) return null;
  const candidate = (value as Record<string, unknown>)[DISPLAY_PATH_MAP_KEY];
  if (!isRecord(candidate)) return null;
  const out: DisplayPathMap = {};
  Object.entries(candidate).forEach(([key, segment]) => {
    if (typeof segment === 'string' || typeof segment === 'number') {
      out[key] = segment;
    }
  });
  return out;
}

/** 해당 기능 흐름을 처리 */
export function resolveDisplayChildPathSegment(
  parentValue: unknown,
  key: string | number,
): JsonPathSegment {
  /** 표시용 key를 원본 inspect 경로 세그먼트로 역매핑한다. */
  const pathMap = readDisplayPathMap(parentValue);
  if (!pathMap) return key;
  const mapped = pathMap[String(key)];
  return typeof mapped === 'string' || typeof mapped === 'number' ? mapped : key;
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
