import { isRecord } from '../../../shared/inspector';
import type { JsonPathSegment } from '../../../shared/inspector';

const MAP_ENTRY_PATH_SEGMENT_PREFIX = '__ec_map_entry__';
const SET_ENTRY_PATH_SEGMENT_PREFIX = '__ec_set_entry__';
const DISPLAY_PATH_MAP_KEY = '__ecDisplayPathMap';
const DISPLAY_COLLECTION_TYPE_KEY = '__ecDisplayCollectionType';
const DISPLAY_COLLECTION_SIZE_KEY = '__ecDisplayCollectionSize';

export type DisplayPathMap = Record<string, JsonPathSegment>;
export type DisplayCollectionType = 'map' | 'set';

export interface DisplayCollectionMeta {
  type: DisplayCollectionType;
  size: number;
}

/** 해당 기능 흐름을 처리 */
export function makeMapEntryPathSegment(index: number): string {
  return `${MAP_ENTRY_PATH_SEGMENT_PREFIX}${index}`;
}

/** 해당 기능 흐름을 처리 */
export function makeSetEntryPathSegment(index: number): string {
  return `${SET_ENTRY_PATH_SEGMENT_PREFIX}${index}`;
}

/** 해당 기능 흐름을 처리 */
export function attachDisplayPathMap(target: object, pathMap: DisplayPathMap) {
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
export function attachDisplayCollectionMeta(
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
